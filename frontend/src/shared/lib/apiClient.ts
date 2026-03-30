import { supabase } from "./supabase";

function apiPrefix(): string {
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
  return base ? `${base}/api` : "/api";
}

/**
 * Authenticated fetch to the Monolog API. Paths are relative to /api (e.g. "/posts", "/settings").
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const p = path.startsWith("/") ? path : `/${path}`;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init?.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(`${apiPrefix()}${p}`, { ...init, headers });
}
