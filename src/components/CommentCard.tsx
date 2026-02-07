import type { Comment } from "../types";
import CommentInput from "./CommentInput";

interface CommentCardProps {
  comment: Comment;
  onReply?: (parentId: string, content: string) => void;
  replyingTo?: string | null;
  onStartReply?: (commentId: string) => void;
  onCancelReply?: () => void;
}

export default function CommentCard({
  comment,
  onReply,
  replyingTo,
  onStartReply,
  onCancelReply,
}: CommentCardProps) {
  const isAI = comment.isAI ?? true;
  const isReplying = replyingTo === comment.id;

  const handleReplySubmit = (content: string) => {
    if (onReply) {
      onReply(comment.id, content);
    }
  };

  const borderStyle = isAI && comment.personaBorderColor
    ? { borderLeftColor: comment.personaBorderColor }
    : {};

  return (
    <div
      className={`comment-card animate-slide-up ${
        isAI ? "comment-card--ai" : "comment-card--user"
      }`}
      style={isAI && comment.personaBorderColor ? { borderLeftWidth: "3px", borderLeftStyle: "solid", ...borderStyle } : {}}
    >
      <p className="text-sm text-secondary mb-2">
        {isAI && comment.personaEmoji && (
          <span className="mr-1">{comment.personaEmoji}</span>
        )}
        {isAI && comment.personaColor ? (
          <span style={{ color: comment.personaColor }}>{comment.persona}</span>
        ) : (
          comment.persona
        )}
      </p>
      <p className="text-primary leading-relaxed whitespace-pre-wrap">{comment.content}</p>

      {/* Reply button */}
      {onStartReply && !isReplying && (
        <button
          onClick={() => onStartReply(comment.id)}
          className="mt-3 text-sm text-secondary hover:text-accent transition-colors"
        >
          Reply
        </button>
      )}

      {/* Reply input */}
      {isReplying && (
        <div className="mt-4">
          <CommentInput
            onSubmit={handleReplySubmit}
            placeholder="Write a reply..."
          />
          <button
            type="button"
            onClick={onCancelReply}
            className="mt-2 text-sm text-muted hover:text-secondary transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 space-y-3">
          {comment.replies.map((reply) => (
            <div
              key={reply.id}
              className="ml-6 pl-4 border-l-2"
              style={
                reply.isAI && reply.personaBorderColor
                  ? { borderLeftColor: reply.personaBorderColor }
                  : reply.isAI
                  ? { borderLeftColor: "var(--color-border-dark, #d1d5db)" }
                  : { borderLeftColor: "#fde68a" }
              }
            >
              <p className="text-sm text-secondary mb-1">
                {reply.isAI && reply.personaEmoji && (
                  <span className="mr-1">{reply.personaEmoji}</span>
                )}
                {reply.isAI && reply.personaColor ? (
                  <span style={{ color: reply.personaColor }}>{reply.persona}</span>
                ) : (
                  reply.persona
                )}
              </p>
              <p className="text-primary text-sm leading-relaxed whitespace-pre-wrap">
                {reply.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
