from pydantic import BaseModel, ConfigDict


class PostCreate(BaseModel):
    title: str
    content: str


class PostUpdate(BaseModel):
    title: str
    content: str


class CommentCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    personaId: str
    content: str
    parentId: str | None = None
