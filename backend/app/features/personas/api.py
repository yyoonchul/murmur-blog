from fastapi import APIRouter, Depends, HTTPException

from app.features.personas import service as personas_service
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
