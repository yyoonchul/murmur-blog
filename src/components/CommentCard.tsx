import type { Comment } from "../types";

interface CommentCardProps {
  comment: Comment;
  onReply?: (commentId: string) => void;
}

export default function CommentCard({ comment, onReply }: CommentCardProps) {
  const isAI = comment.isAI ?? true; // default to AI for legacy comments with persona
  return (
    <div
      className={`comment-card animate-slide-up ${
        isAI ? "comment-card--ai" : "comment-card--user"
      }`}
    >
      <p className="text-sm text-secondary mb-2">{comment.persona}</p>
      <p className="text-primary leading-relaxed">{comment.content}</p>
      {onReply && (
        <button
          onClick={() => onReply(comment.id)}
          className="mt-3 text-sm text-secondary hover:text-accent transition-colors"
        >
          Reply
        </button>
      )}

      {/* Nested replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4 ml-6 space-y-3">
          {comment.replies.map((reply) => (
            <div key={reply.id} className="border-l-2 border-border-light pl-4">
              <p className="text-sm text-secondary mb-1">{reply.persona}</p>
              <p className="text-primary text-sm leading-relaxed">
                {reply.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
