import { marked } from "marked";
import type { Comment } from "../types";
import CommentInput from "./CommentInput";
import AiTypingIndicator from "./AiTypingIndicator";

interface CommentCardProps {
  comment: Comment;
  onReply?: (parentId: string, content: string) => void;
  replyingTo?: string | null;
  onStartReply?: (commentId: string) => void;
  onCancelReply?: () => void;
  isGeneratingReply?: boolean;
}

export default function CommentCard({
  comment,
  onReply,
  replyingTo,
  onStartReply,
  onCancelReply,
  isGeneratingReply,
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
          {comment.replies.map((reply) => {
            const replyHtml = marked.parse(reply.content) as string;
            return (
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
                <div
                  className="comment-markdown text-primary text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: replyHtml }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* AI generating reply indicator */}
      {isGeneratingReply && (
        <div className="mt-4 ml-6 pl-4 border-l-2" style={{ borderLeftColor: "var(--color-border-dark, #d1d5db)" }}>
          <AiTypingIndicator compact />
        </div>
      )}
    </div>
  );
}
