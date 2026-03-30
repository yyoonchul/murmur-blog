import uuid
from datetime import datetime

from sqlalchemy import String, Text, ForeignKey, ARRAY, text
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.db import Base


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True)
    display_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=text("NOW()"))


class PersonaLibrary(Base):
    __tablename__ = "persona_library"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(Text)
    emoji: Mapped[str] = mapped_column(Text)
    color: Mapped[str] = mapped_column(Text)
    bg_color: Mapped[str] = mapped_column("bg_color", Text)
    border_color: Mapped[str] = mapped_column("border_color", Text)
    prompt_file: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text, server_default=text("''"))
    prompt_content: Mapped[str] = mapped_column(Text)


class UserSettings(Base):
    __tablename__ = "user_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True)
    provider: Mapped[str] = mapped_column(Text, server_default=text("'anthropic'"))
    model: Mapped[str | None] = mapped_column(Text, nullable=True)
    provider_models: Mapped[dict] = mapped_column(JSONB, server_default=text("'{}'::jsonb"))
    custom_models: Mapped[dict] = mapped_column(JSONB, server_default=text("'{\"anthropic\": [], \"openai\": [], \"google\": []}'::jsonb"))
    updated_at: Mapped[datetime] = mapped_column(server_default=text("NOW()"))


class UserSecrets(Base):
    __tablename__ = "user_secrets"

    user_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True)
    ciphertext: Mapped[str] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(server_default=text("NOW()"))


class UserPersonaState(Base):
    __tablename__ = "user_persona_state"

    user_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True)
    feedback_order: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default=text("ARRAY[]::text[]"))
    feedback_order_reason: Mapped[str] = mapped_column(Text, server_default=text("''"))
    active_persona_ids: Mapped[list[str]] = mapped_column(ARRAY(Text), server_default=text("ARRAY[]::text[]"))


class UserCustomPersona(Base):
    """User-defined personas; API id is ``c:{uuid}`` (see docs/DATABASE.md)."""

    __tablename__ = "user_custom_personas"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(Text)
    role: Mapped[str] = mapped_column(Text)
    description: Mapped[str] = mapped_column(Text, server_default=text("''"))
    prompt_content: Mapped[str] = mapped_column(Text)
    emoji: Mapped[str] = mapped_column(Text, server_default=text("''"))
    color: Mapped[str] = mapped_column(Text, server_default=text("''"))
    bg_color: Mapped[str] = mapped_column("bg_color", Text, server_default=text("''"))
    border_color: Mapped[str] = mapped_column("border_color", Text, server_default=text("''"))
    created_at: Mapped[datetime] = mapped_column(server_default=text("NOW()"))
    updated_at: Mapped[datetime] = mapped_column(server_default=text("NOW()"))


class UserPersonaOverride(Base):
    __tablename__ = "user_persona_overrides"

    user_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"), primary_key=True)
    persona_id: Mapped[str] = mapped_column(String, ForeignKey("persona_library.id", ondelete="CASCADE"), primary_key=True)
    name: Mapped[str | None] = mapped_column(Text, nullable=True)
    role: Mapped[str | None] = mapped_column(Text, nullable=True)
    emoji: Mapped[str | None] = mapped_column(Text, nullable=True)
    color: Mapped[str | None] = mapped_column(Text, nullable=True)
    bg_color: Mapped[str | None] = mapped_column("bg_color", Text, nullable=True)
    border_color: Mapped[str | None] = mapped_column("border_color", Text, nullable=True)
    prompt_content: Mapped[str | None] = mapped_column(Text, nullable=True)


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"))
    title: Mapped[str] = mapped_column(Text)
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(server_default=text("NOW()"))
    updated_at: Mapped[datetime] = mapped_column(server_default=text("NOW()"))


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    post_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("posts.id", ondelete="CASCADE"))
    user_id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("profiles.id", ondelete="CASCADE"))
    persona_id: Mapped[str] = mapped_column(Text)
    content: Mapped[str] = mapped_column(Text)
    parent_id: Mapped[uuid.UUID | None] = mapped_column(PG_UUID(as_uuid=True), ForeignKey("comments.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=text("NOW()"))
