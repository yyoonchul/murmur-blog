import uuid

from fastapi import APIRouter, Depends, HTTPException

from app.features.personas import service as personas_service
from app.features.personas.persona_ids import is_custom_persona_id, parse_custom_persona_uuid
from app.shared.deps import AuthContext, get_auth_context
from app.shared.models import UserPersonaState

router = APIRouter(prefix="/personas", tags=["personas"])


@router.get("")
def get_personas(ctx: AuthContext = Depends(get_auth_context)):
    return personas_service.read_personas(ctx.db, ctx.user_id)


@router.put("")
def put_personas(body: dict, ctx: AuthContext = Depends(get_auth_context)):
    try:
        return personas_service.write_personas(ctx.db, ctx.user_id, body)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e


@router.get("/library")
def get_library(ctx: AuthContext = Depends(get_auth_context)):
    return personas_service.read_library_with_status(ctx.db, ctx.user_id)


@router.put("/library/{persona_id}")
def put_library_persona(persona_id: str, body: dict, ctx: AuthContext = Depends(get_auth_context)):
    row = personas_service.update_library_persona(ctx.db, persona_id, body)
    if not row:
        raise HTTPException(404, "Library persona not found")
    st = ctx.db.get(UserPersonaState, ctx.user_id)
    row["isActive"] = bool(st and persona_id in (st.active_persona_ids or []))
    return row


@router.post("/add")
def add_persona(body: dict, ctx: AuthContext = Depends(get_auth_context)):
    pid = body.get("personaId")
    if not pid:
        raise HTTPException(400, "personaId required")
    result = personas_service.add_persona_from_library(ctx.db, ctx.user_id, pid)
    if not result:
        raise HTTPException(400, "Persona not found or already active")
    return result


@router.delete("/{persona_id}")
def remove_persona_route(persona_id: str, ctx: AuthContext = Depends(get_auth_context)):
    result = personas_service.remove_persona(ctx.db, ctx.user_id, persona_id)
    if not result:
        raise HTTPException(404, "Persona not found")
    return result


@router.get("/custom")
def list_custom_personas(ctx: AuthContext = Depends(get_auth_context)):
    return {"customPersonas": personas_service.list_custom_personas(ctx.db, ctx.user_id)}


@router.post("/custom", status_code=201)
def create_custom_persona(body: dict, ctx: AuthContext = Depends(get_auth_context)):
    row = personas_service.create_custom_persona(ctx.db, ctx.user_id, body)
    if not row:
        raise HTTPException(400, "name is required")
    return row


@router.put("/custom/{custom_id}")
def update_custom_persona(custom_id: uuid.UUID, body: dict, ctx: AuthContext = Depends(get_auth_context)):
    row = personas_service.update_custom_persona(ctx.db, ctx.user_id, custom_id, body)
    if not row:
        raise HTTPException(404, "Custom persona not found")
    return row


@router.delete("/custom/{custom_id}")
def delete_custom_persona_route(custom_id: uuid.UUID, ctx: AuthContext = Depends(get_auth_context)):
    if not personas_service.delete_custom_persona(ctx.db, ctx.user_id, custom_id):
        raise HTTPException(404, "Custom persona not found")
    return {"success": True}


@router.post("/custom/add")
def add_custom_to_active(body: dict, ctx: AuthContext = Depends(get_auth_context)):
    raw = body.get("personaId") or body.get("customPersonaId")
    if not raw:
        raise HTTPException(400, "personaId required")
    if isinstance(raw, str) and is_custom_persona_id(raw):
        cid = parse_custom_persona_uuid(raw)
    else:
        try:
            cid = uuid.UUID(str(raw))
        except ValueError:
            cid = None
    if cid is None:
        raise HTTPException(400, "personaId must be c:<uuid> or a UUID") from None
    result = personas_service.add_custom_persona_to_active(ctx.db, ctx.user_id, cid)
    if not result:
        raise HTTPException(404, "Custom persona not found")
    return result
