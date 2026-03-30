"""
LangChain orchestration for persona comments: structured planning + chat generation.

Flow (product):
- New post: plan who comments → each writes a top-level comment → plan inter-persona replies → generate.
- User comment: plan which personas reply → each writes a reply.

Uses ``with_structured_output`` for plans (see LangChain structured output docs) and plain ``invoke`` for prose.
"""

from __future__ import annotations

import json
import logging
import random
from typing import Any

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage

from app.shared.comment_langchain.model_factory import make_chat_model
from app.shared.comment_langchain.schemas import (
    InitialPersonaPlan,
    InterPersonaReplyPlan,
    UserThreadReplyPlan,
)

log = logging.getLogger(__name__)

MAX_INITIAL_COMMENTERS = 5
MAX_INTER_PERSONA_REPLIES = 3
MAX_USER_REPLY_PERSONAS = 2
PLAN_TEMPERATURE = 0.2
WRITE_TEMPERATURE = 0.7


def _extract_text(content: Any) -> str:
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        parts: list[str] = []
        for block in content:
            if isinstance(block, dict):
                if block.get("type") == "text" and isinstance(block.get("text"), str):
                    parts.append(block["text"])
            elif hasattr(block, "text") and isinstance(getattr(block, "text"), str):
                parts.append(getattr(block, "text"))
        return "".join(parts).strip()
    return (str(content) if content is not None else "").strip()


def invoke_comment_text(chat: BaseChatModel, *, system: str, user: str) -> str:
    msg = chat.invoke([SystemMessage(content=system), HumanMessage(content=user)])
    return _extract_text(msg.content)


def _allowed_ids(personas: list[dict[str, Any]]) -> set[str]:
    return {p["id"] for p in personas if isinstance(p.get("id"), str)}


def _persona_catalog_json(personas: list[dict[str, Any]]) -> str:
    rows = []
    for p in personas:
        rows.append(
            {
                "id": p.get("id"),
                "name": p.get("name"),
                "role": p.get("role"),
                "description": (p.get("description") or "") if isinstance(p.get("description"), str) else "",
            }
        )
    return json.dumps(rows, ensure_ascii=False)


def _post_excerpt(post: dict[str, str], max_chars: int = 12000) -> str:
    body = f"# {post['title']}\n\n{post['content']}"
    return body if len(body) <= max_chars else body[: max_chars - 20] + "\n\n[...truncated]"


def plan_initial_persona_ids(
    chat: BaseChatModel,
    post: dict[str, str],
    personas: list[dict[str, Any]],
) -> list[str]:
    allowed = _allowed_ids(personas)
    if not allowed:
        return []
    cap = min(MAX_INITIAL_COMMENTERS, len(allowed))
    planner = chat.with_structured_output(InitialPersonaPlan)
    system = (
        "You choose which reader personas should leave the first comments on a blog post. "
        f"Pick between 1 and {cap} persona ids. "
        "Only use ids from the allowed list. Prefer personas whose role fits the post tone and topic."
    )
    human = (
        "Allowed personas (JSON array):\n"
        f"{_persona_catalog_json(personas)}\n\n"
        "Post:\n"
        f"{_post_excerpt(post)}\n\n"
        "Return persona_ids for initial comments."
    )
    try:
        plan = planner.invoke([SystemMessage(content=system), HumanMessage(content=human)])
    except Exception:
        log.exception("plan_initial_persona_ids: structured invoke failed")
        return []
    if not isinstance(plan, InitialPersonaPlan):
        return []
    out: list[str] = []
    seen: set[str] = set()
    for pid in plan.persona_ids:
        if pid in allowed and pid not in seen:
            seen.add(pid)
            out.append(pid)
        if len(out) >= cap:
            break
    return out


def plan_inter_persona_edges(
    chat: BaseChatModel,
    post: dict[str, str],
    personas: list[dict[str, Any]],
    top_level_comments: list[dict[str, Any]],
) -> list[tuple[str, str]]:
    """
    Returns list of (replier_persona_id, target_comment_id).
    Only top-level comments may be targets; replies attach under that comment id.
    """
    allowed = _allowed_ids(personas)
    if not allowed or not top_level_comments:
        return []

    targets: dict[str, str] = {}
    for c in top_level_comments:
        cid = c.get("id")
        pid = c.get("personaId")
        if isinstance(cid, str) and isinstance(pid, str) and pid in allowed and pid != "user":
            targets[cid] = pid

    if len(targets) < 2:
        return []

    cap = min(MAX_INTER_PERSONA_REPLIES, max(1, len(targets) - 1))
    planner = chat.with_structured_output(InterPersonaReplyPlan)
    catalog = _persona_catalog_json(personas)
    threads = json.dumps(
        [{"id": k, "authorPersonaId": v} for k, v in targets.items()],
        ensure_ascii=False,
    )
    system = (
        "You plan a few cross-persona replies on a blog post. "
        f"Propose at most {cap} replies. "
        "Each reply: replier_persona_id replies to an existing top-level comment id (target_comment_id). "
        "replier must be in the allowed persona list. "
        "Prefer different replier than the target comment author when possible. "
        "Use only target_comment_id values from the provided list."
    )
    human = (
        f"Allowed personas:\n{catalog}\n\n"
        f"Top-level comments:\n{threads}\n\n"
        f"Post excerpt:\n{_post_excerpt(post, 6000)}\n"
    )
    try:
        plan = planner.invoke([SystemMessage(content=system), HumanMessage(content=human)])
    except Exception:
        log.exception("plan_inter_persona_edges: structured invoke failed")
        return []
    if not isinstance(plan, InterPersonaReplyPlan):
        return []

    out: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()
    valid_ids = set(targets.keys())
    for edge in plan.replies:
        rid, tid = edge.replier_persona_id, edge.target_comment_id
        if rid not in allowed or tid not in valid_ids:
            continue
        if targets.get(tid) == rid:
            continue
        key = (rid, tid)
        if key in seen:
            continue
        seen.add(key)
        out.append((rid, tid))
        if len(out) >= cap:
            break
    return out


def plan_user_reply_persona_ids(
    chat: BaseChatModel,
    post: dict[str, str],
    personas: list[dict[str, Any]],
    *,
    thread_context: str,
    user_comment_excerpt: str,
    suggested_responders: list[str] | None = None,
) -> list[str]:
    allowed = _allowed_ids(personas)
    if not allowed:
        return []
    cap = min(MAX_USER_REPLY_PERSONAS, len(allowed))
    planner = chat.with_structured_output(UserThreadReplyPlan)
    hint = ""
    if suggested_responders:
        hint = (
            "\nThe product suggests these personas as natural responders (use subset if appropriate): "
            f"{json.dumps(suggested_responders, ensure_ascii=False)}\n"
        )
    system = (
        "You decide which reader personas should reply to a human user's comment on a blog post. "
        f"Pick between 1 and {cap} persona ids from the allowed list only.{hint}"
        "If the thread is between two personas, prefer continuing that conversation appropriately."
    )
    human = (
        "Allowed personas:\n"
        f"{_persona_catalog_json(personas)}\n\n"
        f"Post:\n{_post_excerpt(post, 8000)}\n\n"
        f"Thread (oldest first):\n{thread_context}\n\n"
        f"Latest user message:\n{user_comment_excerpt}\n"
    )
    try:
        plan = planner.invoke([SystemMessage(content=system), HumanMessage(content=human)])
    except Exception:
        log.exception("plan_user_reply_persona_ids: structured invoke failed")
        return []
    if not isinstance(plan, UserThreadReplyPlan):
        return []
    out: list[str] = []
    seen: set[str] = set()
    for pid in plan.persona_ids:
        if pid in allowed and pid not in seen:
            seen.add(pid)
            out.append(pid)
        if len(out) >= cap:
            break
    return out


def fallback_inter_persona_edges(
    personas: list[dict[str, Any]],
    top_level_comments: list[dict[str, Any]],
    max_edges: int = MAX_INTER_PERSONA_REPLIES,
) -> list[tuple[str, str]]:
    """Deterministic-ish fallback when planning fails: random replier → random other author's top-level comment."""
    allowed = _allowed_ids(personas)
    tops = [
        c
        for c in top_level_comments
        if isinstance(c.get("id"), str)
        and isinstance(c.get("personaId"), str)
        and c["personaId"] in allowed
        and c["personaId"] != "user"
    ]
    if len(tops) < 2:
        return []
    random.shuffle(tops)
    out: list[tuple[str, str]] = []
    for target in tops[: max_edges * 3]:
        tid = target["id"]
        author = target["personaId"]
        candidates = [p for p in allowed if p != author]
        if not candidates:
            continue
        replier = random.choice(list(candidates))
        out.append((replier, tid))
        if len(out) >= max_edges:
            break
    return out


def make_planning_model(
    settings: dict[str, Any],
    secrets: dict[str, Any],
) -> BaseChatModel:
    return make_chat_model(settings, secrets, temperature=PLAN_TEMPERATURE)


def make_writing_model(
    settings: dict[str, Any],
    secrets: dict[str, Any],
) -> BaseChatModel:
    return make_chat_model(settings, secrets, temperature=WRITE_TEMPERATURE)
