import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.shared.crypto_store import decrypt_secrets, encrypt_secrets, merge_env_keys
from app.shared.llm.providers import get_provider, get_provider_types
from app.shared.models import UserSecrets, UserSettings

RESERVED = {"MODEL", "AVAILABLE_MODELS", "PROVIDER", "CUSTOM_MODELS", "PROVIDER_MODELS"}


def user_settings_dict(us: UserSettings) -> dict[str, Any]:
    return {
        "PROVIDER": us.provider,
        "MODEL": us.model,
        "PROVIDER_MODELS": dict(us.provider_models or {}),
        "CUSTOM_MODELS": dict(us.custom_models or {}),
    }


def load_secrets(db: Session, user_id: uuid.UUID) -> dict[str, Any]:
    row = db.get(UserSecrets, user_id)
    raw = decrypt_secrets(row.ciphertext) if row else {}
    return merge_env_keys(raw if isinstance(raw, dict) else {})


def build_settings_get_response(db: Session, user_id: uuid.UUID) -> dict[str, Any]:
    us = db.get(UserSettings, user_id)
    if not us:
        raise RuntimeError("user settings missing")
    blob = user_settings_dict(us)
    current = (blob.get("PROVIDER") or "anthropic")  # type: ignore[assignment]
    provider = get_provider(current, blob)
    available = provider.get_available_models(blob)
    all_provider_models: dict[str, list] = {}
    provider_models: dict[str, str] = {}
    stored_pm = blob.get("PROVIDER_MODELS") or {}
    for pt in get_provider_types():
        p = get_provider(pt, {**blob, "PROVIDER": pt, "MODEL": stored_pm.get(pt)})
        all_provider_models[pt] = p.get_available_models({**blob, "PROVIDER": pt})
        provider_models[pt] = stored_pm.get(pt) or p.get_default_model()
    provider_models[current] = blob.get("MODEL") or provider.get_default_model()

    secrets = load_secrets(db, user_id)
    api_keys = []
    for name, value in secrets.items():
        if name in RESERVED or not isinstance(value, str) or not value.strip():
            continue
        v = value.strip()
        masked = f"{v[:7]}...{v[-4:]}" if len(v) > 11 else "***"
        api_keys.append({"name": name, "masked": masked})

    return {
        "provider": current,
        "providers": get_provider_types(),
        "apiKeys": api_keys,
        "model": blob.get("MODEL") or provider.get_default_model(),
        "availableModels": available,
        "allProviderModels": all_provider_models,
        "providerModels": provider_models,
    }


def apply_settings_put(db: Session, user_id: uuid.UUID, body: dict[str, Any]) -> dict[str, Any]:
    us = db.get(UserSettings, user_id)
    if not us:
        raise RuntimeError("user settings missing")
    blob = user_settings_dict(us)

    api_key = body.get("apiKey")
    api_key_name = body.get("apiKeyName") or "ANTHROPIC_API_KEY"
    delete_api_key = body.get("deleteApiKey")
    rename_from = body.get("renameFrom")
    new_provider = body.get("provider")
    provider_model = body.get("providerModel")
    model = body.get("model")

    if new_provider and new_provider in get_provider_types():
        pm = blob.setdefault("PROVIDER_MODELS", {})
        cur = blob.get("PROVIDER") or "anthropic"
        if blob.get("MODEL"):
            pm[cur] = blob["MODEL"]
        blob["PROVIDER"] = new_provider
        p = get_provider(new_provider, blob)
        blob["MODEL"] = pm.get(new_provider) or p.get_default_model()
        us.provider = new_provider
        us.model = blob["MODEL"]
        us.provider_models = pm

    if provider_model and isinstance(provider_model, dict):
        pp = provider_model.get("provider")
        mm = provider_model.get("model")
        if pp and mm:
            pm = blob.setdefault("PROVIDER_MODELS", {})
            pm[pp] = mm
            us.provider_models = pm
            if pp == (blob.get("PROVIDER") or "anthropic"):
                blob["MODEL"] = mm
                us.model = mm

    secrets = load_secrets(db, user_id)
    if delete_api_key is True:
        secrets.pop(api_key_name, None)
    elif rename_from and rename_from != api_key_name:
        old = secrets.get(rename_from)
        if old:
            secrets[api_key_name] = (api_key or "").strip() or old
            secrets.pop(rename_from, None)
    elif isinstance(api_key, str) and api_key.strip():
        secrets[api_key_name] = api_key.strip()

    if isinstance(model, str) and model.strip():
        blob["MODEL"] = model.strip()
        us.model = model.strip()

    us.provider_models = blob.get("PROVIDER_MODELS") or {}
    us.custom_models = blob.get("CUSTOM_MODELS") or us.custom_models
    us.provider = blob.get("PROVIDER") or us.provider

    if secrets:
        to_store = {k: v for k, v in secrets.items() if isinstance(v, str) and v.strip()}
        if not to_store:
            row = db.get(UserSecrets, user_id)
            if row:
                db.delete(row)
            db.commit()
            db.refresh(us)
            return build_settings_get_response(db, user_id)
        try:
            ct = encrypt_secrets(to_store)
        except RuntimeError as e:
            raise RuntimeError(str(e)) from e
        row = db.get(UserSecrets, user_id)
        if row:
            row.ciphertext = ct
        else:
            db.add(UserSecrets(user_id=user_id, ciphertext=ct))
    else:
        row = db.get(UserSecrets, user_id)
        if row:
            db.delete(row)

    db.commit()
    db.refresh(us)
    return build_settings_get_response(db, user_id)


def add_custom_model(db: Session, user_id: uuid.UUID, body: dict[str, Any]) -> dict[str, Any]:
    provider = body.get("provider")
    model_id = body.get("modelId")
    model_name = body.get("modelName")
    description = (body.get("description") or "").strip() or None
    if not provider or not model_id or not model_name:
        raise ValueError("provider, modelId, and modelName are required")
    if provider not in get_provider_types():
        raise ValueError("Invalid provider")
    us = db.get(UserSettings, user_id)
    if not us:
        raise RuntimeError("user settings missing")
    cm = dict(us.custom_models or {})
    lst = list(cm.get(provider) or [])
    if any(m.get("id") == model_id for m in lst):
        raise ValueError("Model ID already exists")
    entry = {"id": model_id, "name": model_name}
    if description:
        entry["description"] = description
    lst.append(entry)
    cm[provider] = lst
    us.custom_models = cm
    db.commit()
    blob = user_settings_dict(us)
    p = get_provider(provider, {**blob, "PROVIDER": provider})
    return {"provider": provider, "availableModels": p.get_available_models(blob)}


def delete_custom_model(db: Session, user_id: uuid.UUID, provider: str, model_id: str) -> dict[str, Any]:
    if provider not in get_provider_types():
        raise ValueError("Invalid provider")
    us = db.get(UserSettings, user_id)
    if not us:
        raise RuntimeError("user settings missing")
    cm = dict(us.custom_models or {})
    lst = [m for m in (cm.get(provider) or []) if m.get("id") != model_id]
    if len(lst) == len(cm.get(provider) or []):
        raise LookupError("Model not found")
    cm[provider] = lst
    us.custom_models = cm
    db.commit()
    blob = user_settings_dict(us)
    p = get_provider(provider, {**blob, "PROVIDER": provider})
    return {"provider": provider, "availableModels": p.get_available_models(blob)}
