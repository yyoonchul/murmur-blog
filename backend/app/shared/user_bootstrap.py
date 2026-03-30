import uuid

from sqlalchemy.orm import Session

from app.shared.models import Profile, UserPersonaState, UserSettings

DEFAULT_ACTIVE = ["mina", "eunseo", "jihoon", "suhyun", "doyun"]
DEFAULT_REASON = "Warm feedback first → neutral → challenging."


def ensure_user_rows(db: Session, user_id: uuid.UUID) -> None:
    if db.get(Profile, user_id) is None:
        db.add(Profile(id=user_id))
    if db.get(UserSettings, user_id) is None:
        db.add(UserSettings(user_id=user_id))
    if db.get(UserPersonaState, user_id) is None:
        db.add(
            UserPersonaState(
                user_id=user_id,
                active_persona_ids=list(DEFAULT_ACTIVE),
                feedback_order=list(DEFAULT_ACTIVE),
                feedback_order_reason=DEFAULT_REASON,
            )
        )
    db.commit()
