import { apiFetch } from "../../../shared/lib/apiClient";
import type { PersonasDocument } from "../model/types";

export async function getPersonas(): Promise<PersonasDocument> {
  const res = await apiFetch("/personas");
  if (!res.ok) throw new Error("Failed to fetch personas");
  return res.json();
}

export async function putPersonas(body: unknown): Promise<PersonasDocument> {
  const res = await apiFetch("/personas", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || `Failed to save personas (${res.status})`);
  return data as PersonasDocument;
}

export async function getPersonaLibrary(): Promise<{ presets: unknown[] }> {
  const res = await apiFetch("/personas/library");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || "Failed to load library");
  return data as { presets: unknown[] };
}

export async function postAddPersona(personaId: string): Promise<PersonasDocument> {
  const res = await apiFetch("/personas/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personaId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || "Failed to add persona");
  return data as PersonasDocument;
}

export async function deletePersona(personaId: string): Promise<PersonasDocument> {
  const res = await apiFetch(`/personas/${personaId}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || "Failed to remove persona");
  return data as PersonasDocument;
}

export async function putLibraryPersona(
  personaId: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const res = await apiFetch(`/personas/library/${personaId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || "Failed to save");
  return data;
}
