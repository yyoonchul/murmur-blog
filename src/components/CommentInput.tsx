import { useState } from "react";

interface CommentInputProps {
  onSubmit: (content: string) => void;
  placeholder?: string;
}

export default function CommentInput({
  onSubmit,
  placeholder = "Leave a comment...",
}: CommentInputProps) {
  const [content, setContent] = useState("");

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit(content.trim());
      setContent("");
    }
  };

  return (
    <div className="flex items-start gap-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="input-minimal flex-1 min-h-[80px] resize-none"
        placeholder={placeholder}
        rows={3}
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!content.trim()}
        className="text-accent text-sm font-medium hover:text-accent-hover transition-colors disabled:text-muted disabled:cursor-not-allowed mt-2"
      >
        Submit
      </button>
    </div>
  );
}
