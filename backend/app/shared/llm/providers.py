from __future__ import annotations

import logging
import os
from abc import ABC, abstractmethod
from typing import Any

import anthropic
import google.generativeai as genai
from openai import OpenAI

from app.shared.llm.types import LLMMessage, ProviderType

log = logging.getLogger(__name__)

DEFAULT_MODELS: dict[ProviderType, str] = {
    "anthropic": "claude-haiku-4-5-20251001",
    "openai": "gpt-5-mini",
    "google": "gemini-2.5-flash",
}

CLAUDE_MODELS = [
    {"id": "claude-opus-4-5-20251101", "name": "Claude Opus 4.5", "description": "Most intelligent model"},
    {"id": "claude-sonnet-4-5-20250929", "name": "Claude Sonnet 4.5", "description": "Speed + intelligence"},
    {"id": "claude-haiku-4-5-20251001", "name": "Claude Haiku 4.5", "description": "Fastest model"},
]

OPENAI_MODELS = [
    {"id": "gpt-5.2", "name": "GPT-5.2", "description": "Best for coding and agentic tasks"},
    {"id": "gpt-5.2-pro", "name": "GPT-5.2 Pro", "description": "Smarter and more precise responses"},
    {"id": "gpt-5-mini", "name": "GPT-5 Mini", "description": "Fast, cost-efficient for well-defined tasks"},
    {"id": "gpt-5-nano", "name": "GPT-5 Nano", "description": "Fastest, most cost-efficient"},
]

GEMINI_MODELS = [
    {"id": "gemini-3-pro-preview", "name": "Gemini 3 Pro (Preview)", "description": "Most intelligent multimodal model"},
    {"id": "gemini-3-flash-preview", "name": "Gemini 3 Flash (Preview)", "description": "Balanced speed and intelligence"},
    {"id": "gemini-2.5-pro", "name": "Gemini 2.5 Pro", "description": "Advanced thinking model"},
    {"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash", "description": "Best price-performance"},
    {"id": "gemini-2.5-flash-lite", "name": "Gemini 2.5 Flash-Lite", "description": "Ultra fast, cost-efficient"},
]


def get_api_key(key_name: str, secrets: dict[str, Any]) -> str | None:
    v = secrets.get(key_name)
    if isinstance(v, str) and v.strip():
        return v.strip()
    ev = os.environ.get(key_name)
    return ev.strip() if ev else None


class BaseLLMProvider(ABC):
    name: ProviderType

    @abstractmethod
    def send_message(
        self,
        user_message: str,
        *,
        system: str | None = None,
        model: str | None = None,
        max_tokens: int = 4096,
        secrets: dict[str, Any],
        settings: dict[str, Any],
    ) -> str:
        pass

    @abstractmethod
    def send_conversation(
        self,
        messages: list[LLMMessage],
        *,
        system: str | None = None,
        model: str | None = None,
        max_tokens: int = 4096,
        secrets: dict[str, Any],
        settings: dict[str, Any],
    ) -> str:
        pass

    def get_default_model(self) -> str:
        return DEFAULT_MODELS[self.name]

    def get_available_models(self, settings: dict[str, Any]) -> list[dict[str, Any]]:
        raise NotImplementedError


class ClaudeProvider(BaseLLMProvider):
    name: ProviderType = "anthropic"

    def _client(self, secrets: dict[str, Any]) -> anthropic.Anthropic:
        key = get_api_key("ANTHROPIC_API_KEY", secrets)
        if not key:
            raise ValueError("ANTHROPIC_API_KEY not configured. Set it in Settings.")
        return anthropic.Anthropic(api_key=key)

    def get_available_models(self, settings: dict[str, Any]) -> list[dict[str, Any]]:
        custom = settings.get("CUSTOM_MODELS") or {}
        anth = custom.get("anthropic") or []
        extras = [{"id": m["id"], "name": m["name"], "description": m.get("description"), "isCustom": True} for m in anth]
        return [*CLAUDE_MODELS, *extras]

    def send_message(
        self,
        user_message: str,
        *,
        system: str | None = None,
        model: str | None = None,
        max_tokens: int = 4096,
        secrets: dict[str, Any],
        settings: dict[str, Any],
    ) -> str:
        m = model or settings.get("MODEL") or self.get_default_model()
        client = self._client(secrets)
        kwargs: dict[str, Any] = {
            "model": m,
            "max_tokens": max_tokens,
            "messages": [{"role": "user", "content": user_message}],
        }
        if system:
            kwargs["system"] = system
        msg = client.messages.create(**kwargs)
        for block in msg.content:
            if block.type == "text":
                return block.text
        return ""

    def send_conversation(
        self,
        messages: list[LLMMessage],
        *,
        system: str | None = None,
        model: str | None = None,
        max_tokens: int = 4096,
        secrets: dict[str, Any],
        settings: dict[str, Any],
    ) -> str:
        m = model or settings.get("MODEL") or self.get_default_model()
        client = self._client(secrets)
        kwargs: dict[str, Any] = {"model": m, "max_tokens": max_tokens, "messages": messages}
        if system:
            kwargs["system"] = system
        msg = client.messages.create(**kwargs)
        for block in msg.content:
            if block.type == "text":
                return block.text
        return ""


class OpenAIProvider(BaseLLMProvider):
    name: ProviderType = "openai"

    def _client(self, secrets: dict[str, Any]) -> OpenAI:
        key = get_api_key("OPENAI_API_KEY", secrets)
        if not key:
            raise ValueError("OPENAI_API_KEY not configured. Set it in Settings.")
        return OpenAI(api_key=key)

    def get_available_models(self, settings: dict[str, Any]) -> list[dict[str, Any]]:
        custom = settings.get("CUSTOM_MODELS") or {}
        oa = custom.get("openai") or []
        extras = [{"id": m["id"], "name": m["name"], "description": m.get("description"), "isCustom": True} for m in oa]
        return [*OPENAI_MODELS, *extras]

    def send_message(
        self,
        user_message: str,
        *,
        system: str | None = None,
        model: str | None = None,
        max_tokens: int = 4096,
        secrets: dict[str, Any],
        settings: dict[str, Any],
    ) -> str:
        m = model or settings.get("MODEL") or self.get_default_model()
        client = self._client(secrets)
        api_messages: list[dict[str, str]] = []
        if system:
            api_messages.append({"role": "system", "content": system})
        api_messages.append({"role": "user", "content": user_message})
        res = client.chat.completions.create(model=m, max_completion_tokens=max_tokens, messages=api_messages)
        return (res.choices[0].message.content or "") if res.choices else ""

    def send_conversation(
        self,
        messages: list[LLMMessage],
        *,
        system: str | None = None,
        model: str | None = None,
        max_tokens: int = 4096,
        secrets: dict[str, Any],
        settings: dict[str, Any],
    ) -> str:
        m = model or settings.get("MODEL") or self.get_default_model()
        client = self._client(secrets)
        api_messages: list[dict[str, str]] = []
        if system:
            api_messages.append({"role": "system", "content": system})
        for msg in messages:
            api_messages.append({"role": msg["role"], "content": msg["content"]})
        res = client.chat.completions.create(model=m, max_completion_tokens=max_tokens, messages=api_messages)
        return (res.choices[0].message.content or "") if res.choices else ""


class GeminiProvider(BaseLLMProvider):
    name: ProviderType = "google"

    def _configure(self, secrets: dict[str, Any]) -> None:
        key = get_api_key("GOOGLE_API_KEY", secrets)
        if not key:
            raise ValueError("GOOGLE_API_KEY not configured. Set it in Settings.")
        genai.configure(api_key=key)

    def get_available_models(self, settings: dict[str, Any]) -> list[dict[str, Any]]:
        custom = settings.get("CUSTOM_MODELS") or {}
        g = custom.get("google") or []
        extras = [{"id": m["id"], "name": m["name"], "description": m.get("description"), "isCustom": True} for m in g]
        return [*GEMINI_MODELS, *extras]

    def send_message(
        self,
        user_message: str,
        *,
        system: str | None = None,
        model: str | None = None,
        max_tokens: int = 4096,
        secrets: dict[str, Any],
        settings: dict[str, Any],
    ) -> str:
        self._configure(secrets)
        m = model or settings.get("MODEL") or self.get_default_model()
        gen_model = genai.GenerativeModel(
            m,
            system_instruction=system,
            generation_config={"max_output_tokens": max_tokens},
        )
        result = gen_model.generate_content(user_message)
        return result.text or ""

    def send_conversation(
        self,
        messages: list[LLMMessage],
        *,
        system: str | None = None,
        model: str | None = None,
        max_tokens: int = 4096,
        secrets: dict[str, Any],
        settings: dict[str, Any],
    ) -> str:
        self._configure(secrets)
        m = model or settings.get("MODEL") or self.get_default_model()
        gen_model = genai.GenerativeModel(
            m,
            system_instruction=system,
            generation_config={"max_output_tokens": max_tokens},
        )
        history = []
        for msg in messages[:-1]:
            history.append(
                {
                    "role": "user" if msg["role"] == "user" else "model",
                    "parts": [msg["content"]],
                }
            )
        chat = gen_model.start_chat(history=history)
        last = messages[-1]["content"] if messages else ""
        result = chat.send_message(last)
        return result.text or ""


_PROVIDERS: dict[ProviderType, BaseLLMProvider] = {
    "anthropic": ClaudeProvider(),
    "openai": OpenAIProvider(),
    "google": GeminiProvider(),
}


def get_provider_types() -> list[ProviderType]:
    return list(_PROVIDERS.keys())


def get_provider(provider_type: ProviderType | None, settings: dict[str, Any]) -> BaseLLMProvider:
    pt: ProviderType = (provider_type or settings.get("PROVIDER") or "anthropic")  # type: ignore[assignment]
    if pt not in _PROVIDERS:
        pt = "anthropic"
    return _PROVIDERS[pt]


def send_message_llm(
    user_message: str,
    *,
    system: str | None = None,
    max_tokens: int = 4096,
    secrets: dict[str, Any],
    settings: dict[str, Any],
) -> str:
    provider = get_provider(None, settings)
    return provider.send_message(
        user_message,
        system=system,
        max_tokens=max_tokens,
        secrets=secrets,
        settings=settings,
    )
