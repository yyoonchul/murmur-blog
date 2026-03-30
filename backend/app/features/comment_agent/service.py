import logging
import random
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.features.personas.service import (
    all_custom_personas_for_agent,
    all_preset_personas_for_agent,
    read_personas,
    reply_planning_catalog,
    resolve_writing_persona,
)
from app.features.settings.service import load_secrets, user_settings_dict
from app.shared.comment_langchain.orchestrator import (
    invoke_comment_text,
    make_planning_model,
    make_writing_model,
    plan_initial_persona_ids,
    plan_user_reply_persona_ids,
)
from app.shared.llm.providers import send_message_llm
from app.shared.models import Comment, Post, UserSettings

log = logging.getLogger(__name__)

SITUATION_INITIAL = """You are a reader leaving the first comment on a blog post.
Share your thoughts, what resonated with you, or what you're curious about in 1-3 sentences.
Output only the comment text. Write only the comment content without any explanations or meta text."""

SITUATION_REPLY = """You are a reader replying to an existing comment on a blog post.
Considering the context of the previous comments, naturally leave a reply in 1-3 sentences.
Output only the comment text. Write only the comment content without any explanations or meta text."""


def build_initial_candidate_pool(db: Session, user_id: uuid.UUID) -> list[dict[str, Any]]:
    """
    Up to 5 personas: if user has >=3 custom, take 3 custom (oldest first) + fill from presets;
    else all custom + presets to reach 5.
    """
    customs = all_custom_personas_for_agent(db, user_id)
    presets = all_preset_personas_for_agent(db)
    if len(customs) >= 3:
        chosen_c = customs[:3]
    else:
        chosen_c = list(customs)
    need = max(0, 5 - len(chosen_c))
    chosen_p = presets[:need] if need else []
    pool = chosen_c + chosen_p
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for p in pool:
        pid = p.get("id")
        if not isinstance(pid, str) or pid in seen:
            continue
        seen.add(pid)
        out.append(p)
    return out[:5]


def build_system_prompt(situation: str, prompt_content: str) -> str:
    situation_text = SITUATION_INITIAL if situation == "initial" else SITUATION_REPLY
    return situation_text + "\n\n---\n\n" + prompt_content


def build_user_message(post: dict[str, str], thread_context: str | None = None) -> str:
    msg = f"# {post['title']}\n\n{post['content']}"
    if thread_context:
        msg += f"\n\n---\n\n## Comment Context\n\n{thread_context}"
    return msg


def build_thread_context(
    comments: list[dict[str, Any]],
    target_comment_id: str,
    persona_map: dict[str, str],
) -> str:
    chain: list[dict[str, Any]] = []
    current = next((c for c in comments if c["id"] == target_comment_id), None)
    while current:
        chain.insert(0, current)
        pid = current.get("parentId")
        current = next((c for c in comments if c["id"] == pid), None) if pid else None
    lines = []
    for c in chain:
        name = persona_map.get(c["personaId"], c["personaId"])
        lines.append(f"{name}: {c['content']}")
    return "\n\n".join(lines)


def _comments_for_post(db: Session, post_id: uuid.UUID) -> list[Comment]:
    return list(
        db.scalars(select(Comment).where(Comment.post_id == post_id).order_by(Comment.created_at)).all()
    )


def _serialize_comment(c: Comment) -> dict[str, Any]:
    d: dict[str, Any] = {
        "id": str(c.id),
        "personaId": c.persona_id,
        "content": c.content,
        "createdAt": c.created_at.isoformat().replace("+00:00", "Z") if c.created_at else "",
    }
    if c.parent_id:
        d["parentId"] = str(c.parent_id)
    return d


def _load_llm_context(db: Session, user_id: uuid.UUID) -> tuple[dict[str, Any], dict[str, Any]]:
    us = db.get(UserSettings, user_id)
    if not us:
        raise RuntimeError("settings missing")
    settings = user_settings_dict(us)
    secrets = load_secrets(db, user_id)
    return settings, secrets


def _persona_name_map(catalog: list[dict[str, Any]]) -> dict[str, str]:
    return {p["id"]: p["name"] for p in catalog if isinstance(p.get("id"), str)}


def _legacy_initial_only(
    db: Session,
    user_id: uuid.UUID,
    post_id: uuid.UUID,
    post: Post,
    pool: list[dict[str, Any]],
    settings: dict[str, Any],
    secrets: dict[str, Any],
    persona_map: dict[str, str],
    post_dict: dict[str, str],
) -> None:
    for persona in pool[:5]:
        pid = persona.get("id")
        pc = persona.get("promptContent")
        if not isinstance(pid, str) or not isinstance(pc, str):
            continue
        try:
            system = build_system_prompt("initial", pc)
            user_message = build_user_message(post_dict)
            content = send_message_llm(user_message, system=system, secrets=secrets, settings=settings)
            text = (content or "").strip()
            if text:
                c = Comment(
                    id=uuid.uuid4(),
                    post_id=post_id,
                    user_id=user_id,
                    persona_id=pid,
                    content=text,
                    parent_id=None,
                )
                db.add(c)
                db.commit()
        except Exception as e:
            log.exception("legacy initial comment failed for %s: %s", pid, e)


def generate_initial_comments(db: Session, user_id: uuid.UUID, post_id: uuid.UUID) -> None:
    post = db.get(Post, post_id)
    if not post or post.user_id != user_id:
        log.warning("generate_initial_comments: post missing or wrong user")
        return
    pool = build_initial_candidate_pool(db, user_id)
    if not pool:
        log.error("No candidate personas in pool for user %s", user_id)
        return
    pdata = read_personas(db, user_id)
    feedback_order = pdata.get("feedbackOrder") or []
    settings, secrets = _load_llm_context(db, user_id)
    persona_map = _persona_name_map(pool)
    post_dict = {"title": post.title, "content": post.content}

    try:
        plan_chat = make_planning_model(settings, secrets)
        write_chat = make_writing_model(settings, secrets)
    except Exception as e:
        log.warning("LangChain chat model unavailable (%s); using legacy initial comments", e)
        _legacy_initial_only(db, user_id, post_id, post, pool, settings, secrets, persona_map, post_dict)
        return

    allowed = {p["id"] for p in pool}
    initial_ids = plan_initial_persona_ids(plan_chat, post_dict, pool)
    if not initial_ids:
        initial_ids = [pid for pid in feedback_order if pid in allowed]
    if not initial_ids:
        initial_ids = [pool[0]["id"]]

    for persona_id in initial_ids:
        persona = next((p for p in pool if p["id"] == persona_id), None)
        if not persona:
            continue
        try:
            system = build_system_prompt("initial", persona["promptContent"])
            user_message = build_user_message(post_dict)
            text = invoke_comment_text(write_chat, system=system, user=user_message)
            if text:
                c = Comment(
                    id=uuid.uuid4(),
                    post_id=post_id,
                    user_id=user_id,
                    persona_id=persona_id,
                    content=text,
                    parent_id=None,
                )
                db.add(c)
                db.commit()
        except Exception as e:
            log.exception("LangChain initial comment failed for %s: %s", persona_id, e)


def generate_reply(
    db: Session,
    user_id: uuid.UUID,
    post_id: uuid.UUID,
    post: Post,
    user_comment: Comment,
) -> list[Comment]:
    catalog = reply_planning_catalog(db, user_id)
    if not catalog:
        return []
    settings, secrets = _load_llm_context(db, user_id)
    persona_map = _persona_name_map(catalog)
    post_dict = {"title": post.title, "content": post.content}

    suggested: list[str] = []
    if user_comment.parent_id:
        db_comments = _comments_for_post(db, post_id)
        ser = [_serialize_comment(x) for x in db_comments]
        parent = next((x for x in ser if x["id"] == str(user_comment.parent_id)), None)
        if parent and parent["personaId"] != "user":
            suggested.append(parent["personaId"])
    if not suggested:
        suggested.append(catalog[random.randrange(len(catalog))]["id"])

    try:
        plan_chat = make_planning_model(settings, secrets)
        write_chat = make_writing_model(settings, secrets)
    except Exception as e:
        log.warning("LangChain chat model unavailable (%s); using legacy single reply", e)
        return _legacy_single_reply(
            db, user_id, post_id, post, user_comment, catalog, settings, secrets, persona_map, post_dict
        )

    db_comments = _comments_for_post(db, post_id)
    ser = [_serialize_comment(x) for x in db_comments]
    thread_context = build_thread_context(ser, str(user_comment.id), persona_map)
    user_excerpt = user_comment.content or ""

    responder_ids = plan_user_reply_persona_ids(
        plan_chat,
        post_dict,
        catalog,
        thread_context=thread_context,
        user_comment_excerpt=user_excerpt,
        suggested_responders=suggested,
    )
    if not responder_ids:
        responder_ids = suggested[:1]

    parent_for_reply = user_comment.parent_id or user_comment.id
    out: list[Comment] = []
    for responder_id in responder_ids:
        responder = resolve_writing_persona(db, user_id, responder_id)
        if not responder:
            continue
        db_comments = _comments_for_post(db, post_id)
        ser = [_serialize_comment(x) for x in db_comments]
        system = build_system_prompt("reply", responder["promptContent"])
        thread_context = build_thread_context(ser, str(user_comment.id), persona_map)
        user_message = build_user_message(post_dict, thread_context)
        try:
            text = invoke_comment_text(write_chat, system=system, user=user_message)
            if not text:
                continue
            reply = Comment(
                id=uuid.uuid4(),
                post_id=post_id,
                user_id=user_id,
                persona_id=responder_id,
                content=text,
                parent_id=parent_for_reply,
            )
            db.add(reply)
            db.commit()
            db.refresh(reply)
            out.append(reply)
        except Exception as e:
            log.exception("LangChain generate_reply failed for %s: %s", responder_id, e)
    return out


def _legacy_single_reply(
    db: Session,
    user_id: uuid.UUID,
    post_id: uuid.UUID,
    post: Post,
    user_comment: Comment,
    catalog: list[dict[str, Any]],
    settings: dict[str, Any],
    secrets: dict[str, Any],
    persona_map: dict[str, str],
    post_dict: dict[str, str],
) -> list[Comment]:
    if user_comment.parent_id:
        db_comments = _comments_for_post(db, post_id)
        ser = [_serialize_comment(x) for x in db_comments]
        parent = next((x for x in ser if x["id"] == str(user_comment.parent_id)), None)
        if parent and parent["personaId"] != "user":
            responder_id = parent["personaId"]
        else:
            responder_id = catalog[random.randrange(len(catalog))]["id"]
    else:
        responder_id = catalog[random.randrange(len(catalog))]["id"]

    responder = resolve_writing_persona(db, user_id, responder_id)
    if not responder:
        return []

    db_comments = _comments_for_post(db, post_id)
    ser = [_serialize_comment(x) for x in db_comments]
    system = build_system_prompt("reply", responder["promptContent"])
    thread_context = build_thread_context(ser, str(user_comment.id), persona_map)
    user_message = build_user_message(post_dict, thread_context)
    try:
        content = send_message_llm(user_message, system=system, secrets=secrets, settings=settings)
        text = (content or "").strip()
        if not text:
            return []
        parent_for_reply = user_comment.parent_id or user_comment.id
        reply = Comment(
            id=uuid.uuid4(),
            post_id=post_id,
            user_id=user_id,
            persona_id=responder_id,
            content=text,
            parent_id=parent_for_reply,
        )
        db.add(reply)
        db.commit()
        db.refresh(reply)
        return [reply]
    except Exception as e:
        log.exception("generate_reply failed: %s", e)
        return []
