import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getPosts } from "../services/api";
import type { Post } from "../types";

export default function Home() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPosts()
      .then(setPosts)
      .catch(() => setError("글 목록을 불러올 수 없습니다."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <p className="text-muted text-sm">불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in">
        <p className="text-accent text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      {posts.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted mb-4">아직 작성된 글이 없습니다.</p>
          <Link to="/write" className="btn-primary text-sm">
            첫 번째 글 쓰기 →
          </Link>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border-light">
            {posts.map((post) => (
              <li key={post.id}>
                <Link
                  to={`/post/${post.id}`}
                  className="py-5 flex items-center justify-between group block"
                >
                  <span className="text-lg list-item-hover">{post.title}</span>
                  <span className="text-muted text-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    {'>'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-8 pt-8 border-t border-border-light">
            <Link to="/write" className="btn-accent text-sm">
              + 새 글
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
