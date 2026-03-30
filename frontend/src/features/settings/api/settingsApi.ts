import { apiFetch } from "../../../shared/lib/apiClient";

export interface SettingsApiKeyEntry {
  name: string;
  masked: string;
}

export interface SettingsSummary {
  provider: "anthropic" | "openai" | "google";
  apiKeys: SettingsApiKeyEntry[];
}

export async function getSettingsSummary(): Promise<SettingsSummary> {
  const res = await apiFetch("/settings");
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

export async function loadSettings(): Promise<Record<string, unknown>> {
  const res = await apiFetch("/settings");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || `Failed to load settings (${res.status})`);
  return data as Record<string, unknown>;
}

export async function saveSettings(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const res = await apiFetch("/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || `Failed to save (${res.status})`);
  return data as Record<string, unknown>;
}

export async function postCustomModel(body: Record<string, unknown>): Promise<{
  availableModels?: unknown[];
  provider?: string;
}> {
  const res = await apiFetch("/settings/custom-models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || "Failed to add model");
  return data as { availableModels?: unknown[]; provider?: string };
}

export async function deleteCustomModel(provider: string, modelId: string): Promise<{
  availableModels?: unknown[];
}> {
  const res = await apiFetch(
    `/settings/custom-models/${provider}/${encodeURIComponent(modelId)}`,
    { method: "DELETE" }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string })?.error || "Failed to delete");
  return data as { availableModels?: unknown[] };
}
