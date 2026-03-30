import uuid
from dataclasses import dataclass

from fastapi import Depends
from sqlalchemy.orm import Session

from app.features.auth.jwt import get_current_user_id
from app.shared.db import get_db
from app.shared.user_bootstrap import ensure_user_rows


@dataclass
class AuthContext:
    db: Session
    user_id: uuid.UUID


def get_auth_context(
    db: Session = Depends(get_db),
    user_id: uuid.UUID = Depends(get_current_user_id),
) -> AuthContext:
    ensure_user_rows(db, user_id)
    return AuthContext(db=db, user_id=user_id)
