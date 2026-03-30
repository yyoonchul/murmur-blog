import json
import os
from typing import Any

from cryptography.fernet import Fernet, InvalidToken

from app.config import settings


def _fernet() -> Fernet:
    key = (settings.fernet_key or "").strip().encode()
    if not key:
        raise RuntimeError("FERNET_KEY is not set")
    return Fernet(key)


def encrypt_secrets(data: dict[str, str]) -> str:
    return _fernet().encrypt(json.dumps(data).encode()).decode()


def decrypt_secrets(ciphertext: str) -> dict[str, Any]:
    if not ciphertext or not str(ciphertext).strip():
        return {}
    if not (settings.fernet_key or "").strip():
        return {}
    try:
        raw = _fernet().decrypt(str(ciphertext).encode())
        return json.loads(raw.decode())
    except (InvalidToken, json.JSONDecodeError, ValueError, RuntimeError):
        return {}


def merge_env_keys(base: dict[str, Any]) -> dict[str, Any]:
    """Overlay process env for known API key names (deployment default keys)."""
    out = dict(base)
    for name in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GOOGLE_API_KEY"):
        v = os.environ.get(name)
        if v:
            out[name] = v
    return out
