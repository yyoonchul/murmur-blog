import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { marked } from "marked";
import CommentCard from "../components/CommentCard";
import CommentInput from "../components/CommentInput";
import { getPost, deletePost } from "../services/api";
import type { Post, Comment } from "../types";

export default function PostView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [isCommenting, setIsCommenting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getPost(id)
      .then((data) => {
        setPost(data);
        // comments are now part of post metadata
        setComments((data as Post & { comments?: Comment[] }).comments || []);
      })
      .catch(() => setError("글을 불러올 수 없습니다."))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = async () => {
    if (!id || !confirm("정말 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      await deletePost(id);
      navigate("/");
    } catch {
      setError("삭제에 실패했습니다.");
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleCommentSubmit = async (content: string) => {
    setIsCommenting(true);
    // Simulate AI response delay (placeholder for future AI integration)
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const newComment: Comment = {
      id: `c${Date.now()}`,
      postId: post?.id || "",
      persona: "You",
      content,
      createdAt: new Date().toISOString(),
      isAI: false,
    };

    setComments((prev) => [...prev, newComment]);
    setIsCommenting(false);
  };

  // Configure marked for safe HTML rendering
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  if (loading) {
    return (
      <div className="animate-fade-in">
        <p className="text-muted text-sm">불러오는 중...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="animate-fade-in py-16 text-center">
        <p className="text-secondary">{error || "글을 찾을 수 없습니다."}</p>
        <Link to="/" className="btn-accent text-sm mt-4 inline-block">
          홈으로
        </Link>
      </div>
    );
  }

  const renderedContent = marked(post.content);

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        to="/"
        className="text-sm text-secondary hover:text-primary transition-colors inline-flex items-center gap-1 mb-8"
      >
        <span>←</span> 목록
      </Link>

      {/* Post Header */}
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold mb-3">
          {post.title}
        </h1>
        <time className="text-sm text-muted">{formatDate(post.createdAt)}</time>
      </header>

      {/* Post Content */}
      <article
        className="article-body"
        dangerouslySetInnerHTML={{ __html: renderedContent }}
      />

      {/* Divider */}
      <hr className="border-border-light my-12" />

      {/* Comments Section */}
      <section>
        <h2 className="text-sm text-secondary mb-6">
          댓글 ({comments.length})
        </h2>

        {/* Comment List */}
        <div className="space-y-4 mb-8">
          {comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} />
          ))}

          {comments.length === 0 && !isCommenting && (
            <p className="text-muted text-sm py-4">아직 댓글이 없습니다</p>
          )}

          {isCommenting && (
            <div className="comment-card comment-card--ai">
              <p className="text-sm text-secondary mb-2">AI</p>
              <p className="text-muted loading-dots">생각 중</p>
            </div>
          )}
        </div>

        {/* Comment Input */}
        <CommentInput
          onSubmit={handleCommentSubmit}
          placeholder="댓글을 남겨주세요..."
          isLoading={isCommenting}
        />
      </section>

      {/* Edit/Delete Buttons */}
      <div className="mt-12 pt-8 border-t border-border-light flex items-center gap-4">
        <Link to={`/edit/${post.id}`} className="btn-secondary text-sm">
          수정
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-muted hover:text-accent transition-colors"
        >
          {deleting ? "삭제 중..." : "삭제"}
        </button>
      </div>
    </div>
  );
}
