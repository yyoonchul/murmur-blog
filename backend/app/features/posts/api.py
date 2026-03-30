import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import func, select

from app.features.posts.model import CommentCreate, PostCreate, PostUpdate
from app.features.comment_agent.service import generate_initial_comments, generate_reply
from app.shared.deps import AuthContext, get_auth_context
from app.shared.db import SessionLocal
from app.shared.models import Comment, Post

router = APIRouter(prefix="/posts", tags=["posts"])


def _iso(dt: datetime | None) -> str:
    if not dt:
        return ""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.isoformat().replace("+00:00", "Z")


def _comment_out(c: Comment) -> dict:
    d: dict = {
        "id": str(c.id),
        "personaId": c.persona_id,
        "content": c.content,
        "createdAt": _iso(c.created_at),
    }
    if c.parent_id:
        d["parentId"] = str(c.parent_id)
    return d


def _post_summary_out(post: Post, comment_count: int) -> dict:
    return {
        "id": str(post.id),
        "title": post.title,
        "createdAt": _iso(post.created_at),
        "updatedAt": _iso(post.updated_at),
        "commentCount": comment_count,
    }


def _post_out(post: Post, comments: list[Comment]) -> dict:
    return {
        "id": str(post.id),
        "title": post.title,
        "content": post.content,
        "createdAt": _iso(post.created_at),
        "updatedAt": _iso(post.updated_at),
        "comments": [_comment_out(c) for c in comments],
    }


def _bg_run_initial_comments(user_id: str, post_id: str) -> None:
    db = SessionLocal()
    try:
        generate_initial_comments(db, uuid.UUID(user_id), uuid.UUID(post_id))
    finally:
        db.close()


@router.get("")
def list_posts(ctx: AuthContext = Depends(get_auth_context)):
    db = ctx.db
    posts = list(db.scalars(select(Post).where(Post.user_id == ctx.user_id).order_by(Post.created_at.desc())))
    if not posts:
        return []
    ids = [p.id for p in posts]
    rows = db.execute(
        select(Comment.post_id, func.count(Comment.id)).where(Comment.post_id.in_(ids)).group_by(Comment.post_id)
    ).all()
    count_map = {row[0]: row[1] for row in rows}
    return [_post_summary_out(p, int(count_map.get(p.id, 0))) for p in posts]


@router.get("/{post_id}")
def get_post(post_id: uuid.UUID, ctx: AuthContext = Depends(get_auth_context)):
    p = ctx.db.get(Post, post_id)
    if not p or p.user_id != ctx.user_id:
        raise HTTPException(404, "Post not found")
    comments = list(
        ctx.db.scalars(select(Comment).where(Comment.post_id == p.id).order_by(Comment.created_at))
    )
    return _post_out(p, comments)


@router.post("", status_code=201)
def create_post(
    body: PostCreate,
    background_tasks: BackgroundTasks,
    ctx: AuthContext = Depends(get_auth_context),
):
    if not body.title or not body.content:
        raise HTTPException(400, "Title and content are required")
    now = datetime.now(timezone.utc)
    post = Post(user_id=ctx.user_id, title=body.title, content=body.content, created_at=now, updated_at=now)
    ctx.db.add(post)
    ctx.db.commit()
    ctx.db.refresh(post)
    background_tasks.add_task(_bg_run_initial_comments, str(ctx.user_id), str(post.id))
    return _post_out(post, [])


@router.put("/{post_id}")
def update_post(post_id: uuid.UUID, body: PostUpdate, ctx: AuthContext = Depends(get_auth_context)):
    if not body.title or not body.content:
        raise HTTPException(400, "Title and content are required")
    p = ctx.db.get(Post, post_id)
    if not p or p.user_id != ctx.user_id:
        raise HTTPException(404, "Post not found")
    p.title = body.title
    p.content = body.content
    p.updated_at = datetime.now(timezone.utc)
    ctx.db.commit()
    ctx.db.refresh(p)
    comments = list(
        ctx.db.scalars(select(Comment).where(Comment.post_id == p.id).order_by(Comment.created_at))
    )
    return _post_out(p, comments)


@router.delete("/{post_id}")
def delete_post(post_id: uuid.UUID, ctx: AuthContext = Depends(get_auth_context)):
    p = ctx.db.get(Post, post_id)
    if not p or p.user_id != ctx.user_id:
        raise HTTPException(404, "Post not found")
    ctx.db.delete(p)
    ctx.db.commit()
    return {"success": True}


@router.post("/{post_id}/comments", status_code=201)
def add_comment(post_id: uuid.UUID, body: CommentCreate, ctx: AuthContext = Depends(get_auth_context)):
    if not body.personaId or not body.content:
        raise HTTPException(400, "personaId and content are required")
    p = ctx.db.get(Post, post_id)
    if not p or p.user_id != ctx.user_id:
        raise HTTPException(404, "Post not found")
    parent_uuid = uuid.UUID(body.parentId) if body.parentId else None
    c = Comment(
        post_id=post_id,
        user_id=ctx.user_id,
        persona_id=body.personaId,
        content=body.content,
        parent_id=parent_uuid,
    )
    ctx.db.add(c)
    ctx.db.commit()
    ctx.db.refresh(c)
    result = [_comment_out(c)]
    if body.personaId == "user":
        ai = generate_reply(ctx.db, ctx.user_id, post_id, p, c)
        for r in ai:
            result.append(_comment_out(r))
    return result


@router.post("/{post_id}/comments/generate")
def generate_comments(post_id: uuid.UUID, ctx: AuthContext = Depends(get_auth_context)):
    p = ctx.db.get(Post, post_id)
    if not p or p.user_id != ctx.user_id:
        raise HTTPException(404, "Post not found")
    existing = list(ctx.db.scalars(select(Comment).where(Comment.post_id == post_id)))
    if len(existing) > 0:
        raise HTTPException(409, "Comments already exist for this post")
    generate_initial_comments(ctx.db, ctx.user_id, post_id)
    comments = list(
        ctx.db.scalars(select(Comment).where(Comment.post_id == post_id).order_by(Comment.created_at))
    )
    return {"comments": [_comment_out(c) for c in comments]}
