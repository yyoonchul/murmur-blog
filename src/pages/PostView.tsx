import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { marked } from "marked";
import CommentCard from "../components/CommentCard";
import CommentInput from "../components/CommentInput";
import AiTypingIndicator from "../components/AiTypingIndicator";
import { getPost, deletePost, addComment, getPersonas } from "../services/api";
import type { ServerComment } from "../services/api";
import type { Post, Comment, PersonaInfo } from "../types";

type PersonaMap = Map<string, PersonaInfo>;

function transformComments(
  serverComments: ServerComment[],
  postId: string,
  personaMap: PersonaMap
): Comment[] {
  return serverComments.map((c) => {
    const persona = personaMap.get(c.personaId);
    return {
      id: c.id,
      postId,
      persona: c.personaId === "user" ? "Me" : persona?.name || c.personaId,
      content: c.content,
      createdAt: c.createdAt,
      isAI: c.personaId !== "user",
      parentId: c.parentId,
      personaEmoji: persona?.emoji,
      personaColor: persona?.color,
      personaBgColor: persona?.bgColor,
      personaBorderColor: persona?.borderColor,
    };
  });
}

export default function PostView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [personaMap, setPersonaMap] = useState<PersonaMap>(new Map());
  const [aiGenerating, setAiGenerating] = useState(false);
  const [generatingReplyFor, setGeneratingReplyFor] = useState<string | null>(null);

  const justCreated = (location.state as { justCreated?: boolean })?.justCreated === true;
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load personas
  useEffect(() => {
    getPersonas()
      .then((data) => {
        const map = new Map<string, PersonaInfo>();
        for (const p of data.personas) {
          map.set(p.id, p);
        }
        setPersonaMap(map);
      })
      .catch((err) => console.error("Failed to load personas:", err));
  }, []);

  // Load post and comments
  useEffect(() => {
    if (!id) return;
    getPost(id)
      .then((data) => {
        setPost(data);
        const serverComments = (data as Post & { comments?: ServerComment[] }).comments || [];
        setComments(transformComments(serverComments, id, personaMap));
      })
      .catch(() => setError("Failed to load post."))
      .finally(() => setLoading(false));
  }, [id, personaMap]);

  // Re-fetch comments helper
  const refreshComments = useCallback(async () => {
    if (!id) return 0;
    try {
      const data = await getPost(id);
      const serverComments = (data as Post & { comments?: ServerComment[] }).comments || [];
      setComments(transformComments(serverComments, id, personaMap));
      return serverComments.length;
    } catch {
      return 0;
    }
  }, [id, personaMap]);

  // Polling for AI comments after post creation
  useEffect(() => {
    if (!justCreated || !id) return;

    setAiGenerating(true);

    // Clear the justCreated state from location so refresh doesn't re-trigger
    window.history.replaceState({}, "");

    pollingRef.current = setInterval(async () => {
      const count = await refreshComments();
      if (count >= 5) {
        // AI comments are likely done
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
        setAiGenerating(false);
      }
    }, 3000);

    // Timeout after 2 minutes
    pollingTimeoutRef.current = setTimeout(() => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      setAiGenerating(false);
    }, 120000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (pollingTimeoutRef.current) clearTimeout(pollingTimeoutRef.current);
    };
  }, [justCreated, id, refreshComments]);

  const handleDelete = async () => {
    if (!id || !confirm("Are you sure you want to delete this post?")) return;
    setDeleting(true);
    try {
      await deletePost(id);
      navigate("/");
    } catch {
      setError("Failed to delete post.");
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleCommentSubmit = async (content: string) => {
    if (!post) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticComment: Comment = {
      id: tempId,
      postId: post.id,
      persona: "Me",
      content,
      createdAt: new Date().toISOString(),
      isAI: false,
    };

    setComments((prev) => [...prev, optimisticComment]);
    setGeneratingReplyFor(tempId);

    try {
      const savedArr = await addComment(post.id, { personaId: "user", content });
      const newComments = transformComments(savedArr, post.id, personaMap);
      setComments((prev) => {
        const withoutOptimistic = prev.filter((c) => c.id !== tempId);
        return [...withoutOptimistic, ...newComments];
      });
    } catch (err) {
      console.error("Failed to add comment:", err);
      setComments((prev) => prev.filter((c) => c.id !== tempId));
    } finally {
      setGeneratingReplyFor(null);
    }
  };

  const handleReplySubmit = async (parentId: string, content: string) => {
    if (!post) return;

    const tempId = `temp-${Date.now()}`;
    const optimisticReply: Comment = {
      id: tempId,
      postId: post.id,
      persona: "Me",
      content,
      createdAt: new Date().toISOString(),
      isAI: false,
      parentId,
    };

    setComments((prev) => [...prev, optimisticReply]);
    setReplyingTo(null);
    setGeneratingReplyFor(parentId);

    try {
      const savedArr = await addComment(post.id, { personaId: "user", content, parentId });
      const newComments = transformComments(savedArr, post.id, personaMap);
      setComments((prev) => {
        const withoutOptimistic = prev.filter((c) => c.id !== tempId);
        return [...withoutOptimistic, ...newComments];
      });
    } catch (err) {
      console.error("Failed to add reply:", err);
      setComments((prev) => prev.filter((c) => c.id !== tempId));
    } finally {
      setGeneratingReplyFor(null);
    }
  };

  // Build comment tree: attach replies to parent comments
  const buildCommentTree = (flatComments: Comment[]): Comment[] => {
    const topLevel = flatComments.filter((c) => !c.parentId);
    const replies = flatComments.filter((c) => c.parentId);

    return topLevel.map((comment) => ({
      ...comment,
      replies: replies.filter((r) => r.parentId === comment.id),
    }));
  };

  // Configure marked for safe HTML rendering
  marked.setOptions({
    breaks: true,
    gfm: true,
  });

  if (loading) {
    return (
      <div className="animate-fade-in">
        <p className="text-muted text-sm">Loading...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="animate-fade-in py-16 text-center">
        <p className="text-secondary">{error || "Post not found."}</p>
        <Link to="/" className="btn-accent text-sm mt-4 inline-block">
          Back to Home
        </Link>
      </div>
    );
  }

  const renderedContent = marked(post.content);
  const commentTree = buildCommentTree(comments);

  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        to="/"
        className="text-sm text-secondary hover:text-primary transition-colors inline-flex items-center gap-1 mb-8"
      >
        <span>←</span> Back
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
          Comments ({comments.length})
          {aiGenerating && (
            <span className="ml-2">
              <AiTypingIndicator compact />
            </span>
          )}
        </h2>

        {/* Comment List */}
        <div className="space-y-4 mb-8">
          {commentTree.map((comment) => (
            <CommentCard
              key={comment.id}
              comment={comment}
              onReply={handleReplySubmit}
              replyingTo={replyingTo}
              onStartReply={setReplyingTo}
              onCancelReply={() => setReplyingTo(null)}
              isGeneratingReply={generatingReplyFor === comment.id}
            />
          ))}

          {comments.length === 0 && !aiGenerating && (
            <p className="text-muted text-sm py-4">No comments yet</p>
          )}

          {comments.length === 0 && aiGenerating && (
            <AiTypingIndicator />
          )}
        </div>

        {/* Comment Input */}
        <CommentInput
          onSubmit={handleCommentSubmit}
          placeholder="Write a comment..."
        />
      </section>

      {/* Edit/Delete Buttons */}
      <div className="mt-12 pt-8 border-t border-border-light flex items-center gap-4">
        <Link to={`/edit/${post.id}`} className="btn-secondary text-sm">
          Edit
        </Link>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="text-sm text-muted hover:text-accent transition-colors"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}
