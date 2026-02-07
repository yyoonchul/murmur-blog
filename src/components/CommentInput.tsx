import { useState } from "react";

interface CommentInputProps {
  onSubmit: (content: string) => void;
  placeholder?: string;
  isLoading?: boolean;
}

export default function CommentInput({
  onSubmit,
  placeholder = "Leave a comment...",
  isLoading = false,
}: CommentInputProps) {
  const [content, setContent] = useState("");

  const handleSubmit = () => {
    if (content.trim() && !isLoading) {
      onSubmit(content.trim());
      setContent("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex items-center gap-4">
      <input
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        className="input-minimal flex-1"
        placeholder={placeholder}
        disabled={isLoading}
      />
      <button
        onClick={handleSubmit}
        disabled={!content.trim() || isLoading}
        className="text-accent text-sm font-medium hover:text-accent-hover transition-colors disabled:text-muted disabled:cursor-not-allowed"
      >
        {isLoading ? <span className="loading-dots">Thinking</span> : "Submit"}
      </button>
    </div>
  );
}
