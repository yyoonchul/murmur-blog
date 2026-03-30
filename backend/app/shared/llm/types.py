from typing import Literal, TypedDict

ProviderType = Literal["anthropic", "openai", "google"]


class LLMMessage(TypedDict):
    role: str
    content: str
