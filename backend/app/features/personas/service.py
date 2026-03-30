import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.shared.models import PersonaLibrary, UserPersonaOverride, UserPersonaState


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
    }


def read_personas(db: Session, user_id: uuid.UUID) -> dict[str, Any]:
    state = db.get(UserPersonaState, user_id)
    if not state:
        return {"personas": [], "feedbackOrder": [], "feedbackOrderReason": ""}
    ovs = {o.persona_id: o for o in db.scalars(select(UserPersonaOverride).where(UserPersonaOverride.user_id == user_id))}
    personas = []
    for pid in state.active_persona_ids or []:
        lib = db.get(PersonaLibrary, pid)
        if not lib:
            continue
        personas.append(_persona_to_api(lib, ovs.get(pid)))
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


def add_persona_from_library(db: Session, user_id: uuid.UUID, persona_id: str) -> dict[str, Any] | None:
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


def remove_persona(db: Session, user_id: uuid.UUID, persona_id: str) -> dict[str, Any] | None:
    state = db.get(UserPersonaState, user_id)
    if not state:
        return None
    if persona_id not in (state.active_persona_ids or []):
        return None
    state.active_persona_ids = [i for i in (state.active_persona_ids or []) if i != persona_id]
    state.feedback_order = [i for i in (state.feedback_order or []) if i != persona_id]
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
