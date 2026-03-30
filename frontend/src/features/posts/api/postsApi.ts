import { apiFetch } from "../../../shared/lib/apiClient";
import type { Post } from "../model/types";
import type { ServerComment } from "../model/types";

export async function getPosts(): Promise<Post[]> {
  const res = await apiFetch("/posts");
  if (!res.ok) throw new Error("Failed to fetch posts");
  return res.json();
}

export async function getPost(id: string): Promise<Post> {
  const res = await apiFetch(`/posts/${id}`);
  if (!res.ok) throw new Error("Failed to fetch post");
  return res.json();
}

export async function createPost(data: { title: string; content: string }): Promise<Post> {
  const res = await apiFetch("/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create post");
  return res.json();
}

export async function updatePost(id: string, data: { title: string; content: string }): Promise<Post> {
  const res = await apiFetch(`/posts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update post");
  return res.json();
}

export async function deletePost(id: string): Promise<void> {
  const res = await apiFetch(`/posts/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete post");
}

export async function addComment(
  postId: string,
  data: { personaId: string; content: string; parentId?: string }
): Promise<ServerComment[]> {
  const res = await apiFetch(`/posts/${postId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add comment");
  return res.json();
}

export async function generateComments(postId: string): Promise<{ comments: ServerComment[] }> {
  const res = await apiFetch(`/posts/${postId}/comments/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to generate comments");
  return res.json();
}
