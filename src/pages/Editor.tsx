import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPost, createPost, updatePost } from "../services/api";

export default function Editor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (id) {
      getPost(id)
        .then((post) => {
          setTitle(post.title);
          setContent(post.content);
        })
        .catch(() => setError("글을 불러올 수 없습니다."))
        .finally(() => setLoading(false));
    } else {
      titleRef.current?.focus();
    }
  }, [id]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.max(400, textarea.scrollHeight);
      textarea.style.height = newHeight + "px";
    }
  }, [content]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError("제목과 내용을 입력해주세요.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEdit && id) {
        await updatePost(id, { title: title.trim(), content: content.trim() });
        navigate(`/post/${id}`);
      } else {
        const post = await createPost({ title: title.trim(), content: content.trim() });
        navigate(`/post/${post.id}`, { state: { justCreated: true } });
      }
    } catch {
      setError("저장에 실패했습니다.");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <p className="text-muted text-sm">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <form onSubmit={handleSubmit} className="space-y-6">
        <input
          ref={titleRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="제목"
          className="w-full font-display text-3xl font-semibold bg-transparent border-none outline-none placeholder:text-muted"
        />

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="마크다운으로 작성하세요..."
          className="w-full min-h-[400px] bg-transparent border-none outline-none resize-none text-primary leading-relaxed placeholder:text-muted font-mono text-sm"
        />

        <div className="flex items-center justify-between pt-4 border-t border-border-light">
          <div className="flex items-center gap-4">
            <span className="text-muted text-xs">
              {content.length.toLocaleString()}자
            </span>
            {error && <span className="text-accent text-sm">{error}</span>}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="text-secondary text-sm hover:text-primary transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim() || !content.trim()}
              className="btn-primary text-sm"
            >
              {saving ? "저장 중..." : isEdit ? "수정 완료 →" : "발행 →"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
