import { marked } from "marked";
import type { Comment } from "../types";
import CommentInput from "./CommentInput";
import AiTypingIndicator from "./AiTypingIndicator";

interface CommentCardProps {
  comment: Comment;
  depth?: number;
  maxDepth?: number;
  onReply?: (parentId: string, content: string) => void;
  replyingTo?: string | null;
  onStartReply?: (commentId: string) => void;
  onCancelReply?: () => void;
  generatingReplyFor?: string | null;
}

export default function CommentCard({
  comment,
  depth = 0,
  maxDepth = 8,
  onReply,
  replyingTo,
  onStartReply,
  onCancelReply,
  generatingReplyFor,
}: CommentCardProps) {
  const isAI = comment.isAI ?? true;
  const isReplying = replyingTo === comment.id;
  const canReply = depth < maxDepth;
  const isGeneratingReply = generatingReplyFor === comment.id;

  const handleReplySubmit = (content: string) => {
    if (onReply) {
      onReply(comment.id, content);
    }
  };

  const borderStyle = isAI && comment.personaBorderColor
    ? { borderLeftColor: comment.personaBorderColor }
    : {};

  const renderedContent = marked.parse(comment.content) as string;

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
      <div
        className="comment-markdown text-primary leading-relaxed"
        dangerouslySetInnerHTML={{ __html: renderedContent }}
      />

      {/* Reply button */}
      {canReply && onStartReply && !isReplying && (
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

      {/* Nested replies - recursive rendering */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="nested-replies mt-4 space-y-3">
          {comment.replies.map((reply) => (
            <div
              key={reply.id}
              className="comment-thread"
              style={{
                marginLeft: depth < 6 ? "16px" : "8px",
                paddingLeft: "12px",
                borderLeftWidth: "2px",
                borderLeftStyle: "solid",
                borderLeftColor: reply.isAI
                  ? reply.personaBorderColor || "var(--color-border-dark, #d1d5db)"
                  : "#fde68a",
              }}
            >
              <CommentCard
                comment={reply}
                depth={depth + 1}
                maxDepth={maxDepth}
                onReply={onReply}
                replyingTo={replyingTo}
                onStartReply={onStartReply}
                onCancelReply={onCancelReply}
                generatingReplyFor={generatingReplyFor}
              />
            </div>
          ))}
        </div>
      )}

      {/* AI generating reply indicator */}
      {isGeneratingReply && (
        <div
          className="mt-4 comment-thread"
          style={{
            marginLeft: depth < 6 ? "16px" : "8px",
            paddingLeft: "12px",
            borderLeftWidth: "2px",
            borderLeftStyle: "solid",
            borderLeftColor: "var(--color-border-dark, #d1d5db)",
          }}
        >
          <AiTypingIndicator compact />
        </div>
      )}
    </div>
  );
}
