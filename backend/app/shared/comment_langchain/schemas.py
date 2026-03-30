"""Pydantic schemas for LangChain structured planning (comments / replies)."""

from pydantic import BaseModel, Field


class InitialPersonaPlan(BaseModel):
    """Who should leave the first top-level comments on a new post."""

    persona_ids: list[str] = Field(
        ...,
        min_length=1,
        description="Persona ids to comment (must be chosen only from the allowed list)",
    )
    rationale: str | None = Field(
        None,
        description="Short note on why these personas fit the post (optional)",
    )


class InterPersonaEdge(BaseModel):
    """One persona replies to another persona's top-level comment."""

    replier_persona_id: str = Field(..., description="Persona id who writes the reply")
    target_comment_id: str = Field(
        ...,
        description="Exact id of an existing top-level comment to reply under",
    )


class InterPersonaReplyPlan(BaseModel):
    """Optional cross-persona replies after initial comments exist."""

    replies: list[InterPersonaEdge] = Field(
        default_factory=list,
        description="Directed replies; replier must differ from target comment author when possible",
    )


class UserThreadReplyPlan(BaseModel):
    """Who should respond when the human user comments or replies."""

    persona_ids: list[str] = Field(
        ...,
        min_length=1,
        description="Persona ids to reply (subset of allowed list)",
    )
    rationale: str | None = Field(None, description="Optional brief reason")
