"""Persona id helpers: presets use library id; custom rows use ``c:{uuid}``."""

from __future__ import annotations

import uuid

CUSTOM_PREFIX = "c:"


def custom_persona_api_id(row_id: uuid.UUID) -> str:
    return f"{CUSTOM_PREFIX}{row_id}"


def is_custom_persona_id(persona_id: str) -> bool:
    if not persona_id.startswith(CUSTOM_PREFIX):
        return False
    rest = persona_id[len(CUSTOM_PREFIX) :]
    try:
        uuid.UUID(rest)
    except ValueError:
        return False
    return True


def parse_custom_persona_uuid(persona_id: str) -> uuid.UUID | None:
    if not is_custom_persona_id(persona_id):
        return None
    return uuid.UUID(persona_id[len(CUSTOM_PREFIX) :])
