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
  const res = await apiFetch(`/personas/${encodeURIComponent(personaId)}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || "Failed to remove persona");
  return data as PersonasDocument;
}

export async function putLibraryPersona(
  personaId: string,
  body: Record<string, unknown>
): Promise<unknown> {
  const res = await apiFetch(`/personas/library/${encodeURIComponent(personaId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || "Failed to save");
  return data;
}

export interface CustomPersonaRow {
  id: string;
  name: string;
  role: string;
  description: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  promptFile: string;
  promptContent: string;
  source?: string;
  isActive?: boolean;
}

export async function getCustomPersonasList(): Promise<{ customPersonas: CustomPersonaRow[] }> {
  const res = await apiFetch("/personas/custom");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || "Failed to load custom personas");
  return data as { customPersonas: CustomPersonaRow[] };
}

export async function postCreateCustomPersona(body: Record<string, unknown>): Promise<CustomPersonaRow> {
  const res = await apiFetch("/personas/custom", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || "Failed to create persona");
  return data as CustomPersonaRow;
}

export async function putCustomPersona(
  customUuid: string,
  body: Record<string, unknown>
): Promise<CustomPersonaRow> {
  const res = await apiFetch(`/personas/custom/${encodeURIComponent(customUuid)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || "Failed to save");
  return data as CustomPersonaRow;
}

export async function deleteCustomPersonaApi(customUuid: string): Promise<void> {
  const res = await apiFetch(`/personas/custom/${encodeURIComponent(customUuid)}`, { method: "DELETE" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || "Failed to delete");
}

export async function postAddCustomPersonaActive(personaId: string): Promise<PersonasDocument> {
  const res = await apiFetch("/personas/custom/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ personaId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || "Failed to add persona");
  return data as PersonasDocument;
}
