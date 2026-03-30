import uuid
from functools import lru_cache

import jwt
from fastapi import HTTPException, Header
from jwt import PyJWKClient
from jwt.exceptions import PyJWTError

from app.config import settings


@lru_cache
def _jwks_client() -> PyJWKClient:
    if not settings.supabase_jwks_url:
        raise RuntimeError("SUPABASE_JWKS_URL is not set")
    return PyJWKClient(settings.supabase_jwks_url)


def decode_supabase_jwt(token: str) -> uuid.UUID:
    try:
        signing_key = _jwks_client().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            audience="authenticated",
            options={"verify_aud": True},
        )
    except PyJWTError as e:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from e
    sub = payload.get("sub")
    if not sub:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    try:
        return uuid.UUID(sub)
    except ValueError as e:
        raise HTTPException(status_code=401, detail="Invalid user id in token") from e


def get_current_user_id(authorization: str | None = Header(None)) -> uuid.UUID:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Missing token")
    return decode_supabase_jwt(token)
