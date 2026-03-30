"""Build a LangChain chat model from Monolog user settings and decrypted secrets."""

from __future__ import annotations

from typing import Any

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_anthropic import ChatAnthropic
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI

from app.shared.llm.providers import get_api_key, get_provider
from app.shared.llm.types import ProviderType


def make_chat_model(
    settings: dict[str, Any],
    secrets: dict[str, Any],
    *,
    temperature: float = 0.2,
    max_tokens: int = 4096,
) -> BaseChatModel:
    """Instantiate the provider-specific chat model the user configured in Settings."""
    provider_type: ProviderType = (settings.get("PROVIDER") or "anthropic")  # type: ignore[assignment]
    provider = get_provider(provider_type, settings)
    model_name = settings.get("MODEL") or provider.get_default_model()

    if provider_type == "anthropic":
        key = get_api_key("ANTHROPIC_API_KEY", secrets)
        if not key:
            raise ValueError("ANTHROPIC_API_KEY not configured")
        return ChatAnthropic(
            model=model_name,
            api_key=key,
            temperature=temperature,
            max_tokens=max_tokens,
        )

    if provider_type == "openai":
        key = get_api_key("OPENAI_API_KEY", secrets)
        if not key:
            raise ValueError("OPENAI_API_KEY not configured")
        return ChatOpenAI(
            model=model_name,
            api_key=key,
            temperature=temperature,
            max_completion_tokens=max_tokens,
        )

    if provider_type == "google":
        key = get_api_key("GOOGLE_API_KEY", secrets)
        if not key:
            raise ValueError("GOOGLE_API_KEY not configured")
        return ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=key,
            temperature=temperature,
            max_output_tokens=max_tokens,
        )

    raise ValueError(f"Unsupported provider: {provider_type}")
