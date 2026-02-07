import type { Post, PersonaInfo } from "../types";

const API_BASE = "/api";

export interface ServerComment {
  id: string;
  personaId: string;
  content: string;
  createdAt: string;
  parentId?: string;
}

export async function getPosts(): Promise<Post[]> {
  const res = await fetch(`${API_BASE}/posts`);
  if (!res.ok) throw new Error("Failed to fetch posts");
  return res.json();
}

export async function getPost(id: string): Promise<Post> {
  const res = await fetch(`${API_BASE}/posts/${id}`);
  if (!res.ok) throw new Error("Failed to fetch post");
  return res.json();
}

export async function createPost(data: { title: string; content: string }): Promise<Post> {
  const res = await fetch(`${API_BASE}/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create post");
  return res.json();
}

export async function updatePost(id: string, data: { title: string; content: string }): Promise<Post> {
  const res = await fetch(`${API_BASE}/posts/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update post");
  return res.json();
}

export async function deletePost(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/posts/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Failed to delete post");
}

export async function addComment(
  postId: string,
  data: { personaId: string; content: string; parentId?: string }
): Promise<ServerComment[]> {
  const res = await fetch(`${API_BASE}/posts/${postId}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to add comment");
  return res.json();
}

export async function getPersonas(): Promise<{
  personas: PersonaInfo[];
  feedbackOrder: string[];
}> {
  const res = await fetch(`${API_BASE}/personas`);
  if (!res.ok) throw new Error("Failed to fetch personas");
  return res.json();
}

export async function generateComments(postId: string): Promise<{ comments: ServerComment[] }> {
  const res = await fetch(`${API_BASE}/posts/${postId}/comments/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to generate comments");
  return res.json();
}
