import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.features.personas.persona_ids import custom_persona_api_id, is_custom_persona_id, parse_custom_persona_uuid
from app.shared.models import PersonaLibrary, UserCustomPersona, UserPersonaOverride, UserPersonaState


def _persona_to_api(lib: PersonaLibrary, ov: UserPersonaOverride | None) -> dict[str, Any]:
    prompt = (ov.prompt_content if ov and ov.prompt_content else lib.prompt_content)
    return {
        "id": lib.id,
        "name": ov.name if ov and ov.name else lib.name,
        "role": ov.role if ov and ov.role else lib.role,
        "emoji": ov.emoji if ov and ov.emoji else lib.emoji,
        "color": ov.color if ov and ov.color else lib.color,
        "bgColor": ov.bg_color if ov and ov.bg_color else lib.bg_color,
        "borderColor": ov.border_color if ov and ov.border_color else lib.border_color,
        "promptFile": lib.prompt_file,
        "promptContent": prompt,
        "description": lib.description or "",
        "source": "preset",
    }


def _custom_row_to_api(row: UserCustomPersona) -> dict[str, Any]:
    return {
        "id": custom_persona_api_id(row.id),
        "name": row.name,
        "role": row.role,
        "emoji": row.emoji or "",
        "color": row.color or "",
        "bgColor": row.bg_color or "",
        "borderColor": row.border_color or "",
        "promptFile": "",
        "promptContent": row.prompt_content,
        "description": row.description or "",
        "source": "custom",
    }


def _resolve_active_persona(
    db: Session,
    user_id: uuid.UUID,
    pid: str,
    ovs: dict[str, UserPersonaOverride],
) -> dict[str, Any] | None:
    if is_custom_persona_id(pid):
        cid = parse_custom_persona_uuid(pid)
        if cid is None:
            return None
        row = db.get(UserCustomPersona, cid)
        if not row or row.user_id != user_id:
            return None
        return _custom_row_to_api(row)
    lib = db.get(PersonaLibrary, pid)
    if not lib:
        return None
    return _persona_to_api(lib, ovs.get(pid))


def read_personas(db: Session, user_id: uuid.UUID) -> dict[str, Any]:
    state = db.get(UserPersonaState, user_id)
    if not state:
        return {"personas": [], "feedbackOrder": [], "feedbackOrderReason": ""}
    ovs = {o.persona_id: o for o in db.scalars(select(UserPersonaOverride).where(UserPersonaOverride.user_id == user_id))}
    personas = []
    for pid in state.active_persona_ids or []:
        p = _resolve_active_persona(db, user_id, pid, ovs)
        if p:
            personas.append(p)
    return {
        "personas": personas,
        "feedbackOrder": list(state.feedback_order or []),
        "feedbackOrderReason": state.feedback_order_reason or "",
    }


def write_personas(db: Session, user_id: uuid.UUID, body: dict[str, Any]) -> dict[str, Any]:
    personas = body.get("personas")
    if not isinstance(personas, list):
        raise ValueError("personas must be an array")
    state = db.get(UserPersonaState, user_id)
    if not state:
        raise RuntimeError("persona state missing")
    state.feedback_order = list(body.get("feedbackOrder") or [])
    state.feedback_order_reason = (body.get("feedbackOrderReason") or "") if isinstance(body.get("feedbackOrderReason"), str) else ""
    state.active_persona_ids = [p["id"] for p in personas if isinstance(p, dict) and p.get("id")]
    for p in personas:
        if not isinstance(p, dict) or not p.get("id"):
            continue
        pid = p["id"]
        if is_custom_persona_id(pid):
            cid = parse_custom_persona_uuid(pid)
            if cid is None:
                continue
            row = db.get(UserCustomPersona, cid)
            if not row or row.user_id != user_id:
                continue
            if isinstance(p.get("name"), str):
                row.name = p["name"]
            if isinstance(p.get("role"), str):
                row.role = p["role"]
            if isinstance(p.get("description"), str):
                row.description = p["description"]
            if isinstance(p.get("promptContent"), str):
                row.prompt_content = p["promptContent"]
            if isinstance(p.get("emoji"), str):
                row.emoji = p["emoji"]
            if isinstance(p.get("color"), str):
                row.color = p["color"]
            if isinstance(p.get("bgColor"), str):
                row.bg_color = p["bgColor"]
            if isinstance(p.get("borderColor"), str):
                row.border_color = p["borderColor"]
            row.updated_at = datetime.now(timezone.utc)
            continue
        lib = db.get(PersonaLibrary, pid)
        if not lib:
            continue
        ov = db.get(UserPersonaOverride, (user_id, pid))
        if ov is None:
            ov = UserPersonaOverride(user_id=user_id, persona_id=pid)
            db.add(ov)
        if isinstance(p.get("promptContent"), str):
            ov.prompt_content = p["promptContent"]
        for src, dst in [
            ("name", "name"),
            ("role", "role"),
            ("emoji", "emoji"),
            ("color", "color"),
            ("bgColor", "bg_color"),
            ("borderColor", "border_color"),
        ]:
            if isinstance(p.get(src), str):
                setattr(ov, dst, p[src])
    db.commit()
    return read_personas(db, user_id)


def read_library_with_status(db: Session, user_id: uuid.UUID) -> dict[str, Any]:
    state = db.get(UserPersonaState, user_id)
    active = set(state.active_persona_ids or []) if state else set()
    ovs = {o.persona_id: o for o in db.scalars(select(UserPersonaOverride).where(UserPersonaOverride.user_id == user_id))}
    active_data = read_personas(db, user_id)
    active_map = {p["id"]: p for p in active_data["personas"]}
    presets = []
    for lib in db.scalars(select(PersonaLibrary).order_by(PersonaLibrary.id)):
        is_active = lib.id in active
        if is_active:
            p = active_map.get(lib.id)
            if p:
                presets.append(
                    {
                        **{k: p[k] for k in ("id", "name", "role", "emoji", "color", "bgColor", "borderColor", "promptFile")},
                        "description": lib.description,
                        "isActive": True,
                        "promptContent": p["promptContent"],
                    }
                )
            continue
        ov = ovs.get(lib.id)
        presets.append(
            {
                "id": lib.id,
                "name": lib.name,
                "role": lib.role,
                "emoji": lib.emoji,
                "color": lib.color,
                "bgColor": lib.bg_color,
                "borderColor": lib.border_color,
                "promptFile": lib.prompt_file,
                "description": lib.description,
                "isActive": False,
                "promptContent": lib.prompt_content,
            }
        )
    return {"presets": presets}


def list_custom_personas(db: Session, user_id: uuid.UUID) -> list[dict[str, Any]]:
    rows = list(
        db.scalars(
            select(UserCustomPersona)
            .where(UserCustomPersona.user_id == user_id)
            .order_by(UserCustomPersona.created_at.desc())
        )
    )
    state = db.get(UserPersonaState, user_id)
    active = set(state.active_persona_ids or []) if state else set()
    out = []
    for row in rows:
        api = _custom_row_to_api(row)
        pid = api["id"]
        api["isActive"] = pid in active
        out.append(api)
    return out


def create_custom_persona(db: Session, user_id: uuid.UUID, body: dict[str, Any]) -> dict[str, Any] | None:
    name = body.get("name")
    role = body.get("role")
    prompt_content = body.get("promptContent")
    if not isinstance(name, str) or not name.strip():
        return None
    if not isinstance(role, str):
        role = ""
    if not isinstance(prompt_content, str):
        prompt_content = ""
    now = datetime.now(timezone.utc)
    row = UserCustomPersona(
        user_id=user_id,
        name=name.strip(),
        role=role.strip(),
        description=(body["description"].strip() if isinstance(body.get("description"), str) else ""),
        prompt_content=prompt_content,
        emoji=body.get("emoji") if isinstance(body.get("emoji"), str) else "",
        color=body.get("color") if isinstance(body.get("color"), str) else "",
        bg_color=body.get("bgColor") if isinstance(body.get("bgColor"), str) else "",
        border_color=body.get("borderColor") if isinstance(body.get("borderColor"), str) else "",
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _custom_row_to_api(row)


def update_custom_persona(db: Session, user_id: uuid.UUID, custom_id: uuid.UUID, body: dict[str, Any]) -> dict[str, Any] | None:
    row = db.get(UserCustomPersona, custom_id)
    if not row or row.user_id != user_id:
        return None
    if isinstance(body.get("name"), str):
        row.name = body["name"].strip() or row.name
    if isinstance(body.get("role"), str):
        row.role = body["role"]
    if isinstance(body.get("description"), str):
        row.description = body["description"]
    if isinstance(body.get("promptContent"), str):
        row.prompt_content = body["promptContent"]
    if isinstance(body.get("emoji"), str):
        row.emoji = body["emoji"]
    if isinstance(body.get("color"), str):
        row.color = body["color"]
    if isinstance(body.get("bgColor"), str):
        row.bg_color = body["bgColor"]
    if isinstance(body.get("borderColor"), str):
        row.border_color = body["borderColor"]
    row.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(row)
    return _custom_row_to_api(row)


def delete_custom_persona(db: Session, user_id: uuid.UUID, custom_id: uuid.UUID) -> bool:
    row = db.get(UserCustomPersona, custom_id)
    if not row or row.user_id != user_id:
        return False
    pid = custom_persona_api_id(custom_id)
    state = db.get(UserPersonaState, user_id)
    if state:
        state.active_persona_ids = [i for i in (state.active_persona_ids or []) if i != pid]
        state.feedback_order = [i for i in (state.feedback_order or []) if i != pid]
    db.delete(row)
    db.commit()
    return True


def add_persona_from_library(db: Session, user_id: uuid.UUID, persona_id: str) -> dict[str, Any] | None:
    if is_custom_persona_id(persona_id):
        return None
    lib = db.get(PersonaLibrary, persona_id)
    if not lib:
        return None
    state = db.get(UserPersonaState, user_id)
    if not state:
        return None
    if persona_id in (state.active_persona_ids or []):
        return None
    ids = list(state.active_persona_ids or [])
    ids.append(persona_id)
    state.active_persona_ids = ids
    fo = list(state.feedback_order or [])
    if persona_id not in fo:
        fo.append(persona_id)
    state.feedback_order = fo
    db.commit()
    return read_personas(db, user_id)


def add_custom_persona_to_active(db: Session, user_id: uuid.UUID, custom_id: uuid.UUID) -> dict[str, Any] | None:
    row = db.get(UserCustomPersona, custom_id)
    if not row or row.user_id != user_id:
        return None
    pid = custom_persona_api_id(custom_id)
    state = db.get(UserPersonaState, user_id)
    if not state:
        return None
    if pid in (state.active_persona_ids or []):
        return read_personas(db, user_id)
    ids = list(state.active_persona_ids or [])
    ids.append(pid)
    state.active_persona_ids = ids
    fo = list(state.feedback_order or [])
    if pid not in fo:
        fo.append(pid)
    state.feedback_order = fo
    db.commit()
    return read_personas(db, user_id)


def remove_persona(db: Session, user_id: uuid.UUID, persona_id: str) -> dict[str, Any] | None:
    state = db.get(UserPersonaState, user_id)
    if not state:
        return None
    if persona_id not in (state.active_persona_ids or []):
        return None
    state.active_persona_ids = [i for i in (state.active_persona_ids or []) if i != persona_id]
    state.feedback_order = [i for i in (state.feedback_order or []) if i != persona_id]
    if not is_custom_persona_id(persona_id):
        ov = db.get(UserPersonaOverride, (user_id, persona_id))
        if ov:
            db.delete(ov)
    db.commit()
    return read_personas(db, user_id)


def update_library_persona(db: Session, persona_id: str, body: dict[str, Any]) -> dict[str, Any] | None:
    lib = db.get(PersonaLibrary, persona_id)
    if not lib:
        return None
    if body.get("name") is not None:
        lib.name = body["name"]
    if body.get("role") is not None:
        lib.role = body["role"]
    if body.get("emoji") is not None:
        lib.emoji = body["emoji"]
    if body.get("color") is not None:
        lib.color = body["color"]
    if body.get("bgColor") is not None:
        lib.bg_color = body["bgColor"]
    if body.get("borderColor") is not None:
        lib.border_color = body["borderColor"]
    if isinstance(body.get("promptContent"), str):
        lib.prompt_content = body["promptContent"]
    if isinstance(body.get("description"), str):
        lib.description = body["description"]
    db.commit()
    db.refresh(lib)
    return {
        "id": lib.id,
        "name": lib.name,
        "role": lib.role,
        "emoji": lib.emoji,
        "color": lib.color,
        "bgColor": lib.bg_color,
        "borderColor": lib.border_color,
        "promptFile": lib.prompt_file,
        "description": lib.description,
        "promptContent": lib.prompt_content,
    }


def all_preset_personas_for_agent(db: Session) -> list[dict[str, Any]]:
    """Every library row for comment-agent planning (one-line description + prompt)."""
    out: list[dict[str, Any]] = []
    for lib in db.scalars(select(PersonaLibrary).order_by(PersonaLibrary.id)):
        out.append(
            {
                "id": lib.id,
                "name": lib.name,
                "role": lib.role,
                "description": lib.description or "",
                "promptContent": lib.prompt_content,
                "emoji": lib.emoji,
                "color": lib.color,
                "bgColor": lib.bg_color,
                "borderColor": lib.border_color,
                "promptFile": lib.prompt_file,
            }
        )
    return out


def all_custom_personas_for_agent(db: Session, user_id: uuid.UUID) -> list[dict[str, Any]]:
    rows = list(
        db.scalars(
            select(UserCustomPersona)
            .where(UserCustomPersona.user_id == user_id)
            .order_by(UserCustomPersona.created_at.asc())
        )
    )
    return [_custom_row_to_api(r) for r in rows]


def resolve_writing_persona(db: Session, user_id: uuid.UUID, persona_id: str) -> dict[str, Any] | None:
    """Full persona payload for LLM comment generation (library + overrides or custom row)."""
    if is_custom_persona_id(persona_id):
        cid = parse_custom_persona_uuid(persona_id)
        if cid is None:
            return None
        row = db.get(UserCustomPersona, cid)
        if not row or row.user_id != user_id:
            return None
        return _custom_row_to_api(row)
    lib = db.get(PersonaLibrary, persona_id)
    if not lib:
        return None
    ov = db.get(UserPersonaOverride, (user_id, persona_id))
    return _persona_to_api(lib, ov)


def reply_planning_catalog(db: Session, user_id: uuid.UUID) -> list[dict[str, Any]]:
    """All custom + all presets for user-reply persona selection (one-line descriptions)."""
    customs = all_custom_personas_for_agent(db, user_id)
    presets = all_preset_personas_for_agent(db)
    # Dedupe by id (should not overlap)
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for p in customs + presets:
        pid = p["id"]
        if pid in seen:
            continue
        seen.add(pid)
        out.append(p)
    return out
