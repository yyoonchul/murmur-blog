from fastapi import APIRouter, Depends, HTTPException

from app.features.settings import service as settings_service
from app.shared.deps import AuthContext, get_auth_context

router = APIRouter(prefix="/settings", tags=["settings"])


@router.get("")
def get_settings(ctx: AuthContext = Depends(get_auth_context)):
    try:
        return settings_service.build_settings_get_response(ctx.db, ctx.user_id)
    except Exception as e:
        raise HTTPException(500, str(e)) from e


@router.put("")
def put_settings(body: dict, ctx: AuthContext = Depends(get_auth_context)):
    try:
        return settings_service.apply_settings_put(ctx.db, ctx.user_id, body)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    except RuntimeError as e:
        msg = str(e)
        if "FERNET_KEY" in msg:
            raise HTTPException(503, "FERNET_KEY is required to store API keys") from e
        raise HTTPException(500, msg) from e


@router.post("/custom-models")
def post_custom_model(body: dict, ctx: AuthContext = Depends(get_auth_context)):
    try:
        return settings_service.add_custom_model(ctx.db, ctx.user_id, body)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e


@router.delete("/custom-models/{provider}/{model_id:path}")
def del_custom_model_route(provider: str, model_id: str, ctx: AuthContext = Depends(get_auth_context)):
    try:
        return settings_service.delete_custom_model(ctx.db, ctx.user_id, provider, model_id)
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    except LookupError:
        raise HTTPException(404, "Model not found")
