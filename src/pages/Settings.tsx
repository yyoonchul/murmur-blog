import { useState, useEffect } from "react";

// SVG icons that can be colored
function PersonaIcon({ emoji, color, size = 28 }: { emoji: string; color: string; size?: number }) {
  const iconProps = { width: size, height: size, fill: color, viewBox: "0 0 24 24" };

  switch (emoji) {
    case "💛": // Heart - Reader
      return (
        <svg {...iconProps}>
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      );
    case "✒️": // Pen - Writer
      return (
        <svg {...iconProps}>
          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
        </svg>
      );
    case "⚖️": // Scale - Mentor
      return (
        <svg {...iconProps}>
          <path d="M12 3c-1.27 0-2.4.8-2.82 2H3v2h1.95L2 14c-.47 2 1 4 3.5 4s4.06-2 3.5-4L6.05 7h3.12c.33.85 1.02 1.5 1.83 1.77V20H9v2h6v-2h-2V8.77c.81-.27 1.5-.92 1.83-1.77h3.12L15 14c-.47 2 1 4 3.5 4s4.06-2 3.5-4L19.05 7H21V5h-6.18C14.4 3.8 13.27 3 12 3zm0 2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/>
        </svg>
      );
    case "🔬": // Microscope - Critic
      return (
        <svg {...iconProps}>
          <path d="M11 7c0 .55-.45 1-1 1H8c-.55 0-1-.45-1-1V5c0-.55.45-1 1-1h2c.55 0 1 .45 1 1v2zm-1 3H8c-.55 0-1 .45-1 1v2c0 .55.45 1 1 1h2c.55 0 1-.45 1-1v-2c0-.55-.45-1-1-1zm4-6V2h-3v2H9V2H6v2H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h6v2h2v-2h6c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-1V2h-3v2h-2zm6 14H5V6h14v12z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      );
    case "⚡": // Lightning - Contrarian
      return (
        <svg {...iconProps}>
          <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
        </svg>
      );
    default: // Default circle icon
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10"/>
        </svg>
      );
  }
}

type ModelOption = {
  id: string;
  name: string;
  description?: string;
  inputPrice?: string;
  outputPrice?: string;
  contextWindow?: string;
  maxOutput?: string;
  latency?: string;
  isCustom?: boolean;
};

type ApiKeyEntry = {
  name: string;
  masked: string;
};

type ProviderType = "anthropic" | "openai" | "google";

const PROVIDER_INFO: Record<ProviderType, { name: string; keyName: string }> = {
  anthropic: { name: "Anthropic (Claude)", keyName: "ANTHROPIC_API_KEY" },
  openai: { name: "OpenAI (GPT)", keyName: "OPENAI_API_KEY" },
  google: { name: "Google (Gemini)", keyName: "GOOGLE_API_KEY" },
};

type SettingsState = {
  provider: ProviderType;
  providers: ProviderType[];
  apiKeys: ApiKeyEntry[];
  model: string;
  availableModels: ModelOption[];
};

interface Persona {
  id: string;
  name: string;
  role: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  promptFile: string;
  promptContent: string;
}

interface PersonasData {
  personas: Persona[];
  feedbackOrder: string[];
  feedbackOrderReason: string;
}

interface LibraryPersona {
  id: string;
  name: string;
  role: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  promptFile: string;
  description: string;
  isActive: boolean;
  promptContent: string;
}

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<SettingsState>({
    provider: "anthropic",
    providers: ["anthropic", "openai", "google"],
    apiKeys: [],
    model: "",
    availableModels: [],
  });
  const [providerModalOpen, setProviderModalOpen] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [apiKeyName, setApiKeyName] = useState("API_KEY");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [editingApiKey, setEditingApiKey] = useState<string | null>(null); // null or key name being edited
  const [addingApiKey, setAddingApiKey] = useState(false);
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [addingCustomModel, setAddingCustomModel] = useState(false);
  const [customModelId, setCustomModelId] = useState("");
  const [customModelName, setCustomModelName] = useState("");
  const [customModelDesc, setCustomModelDesc] = useState("");

  // Personas state
  const [personasLoading, setPersonasLoading] = useState(true);
  const [personasSaving, setPersonasSaving] = useState(false);
  const [personasData, setPersonasData] = useState<PersonasData>({
    personas: [],
    feedbackOrder: [],
    feedbackOrderReason: "",
  });
  const [personasMessage, setPersonasMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [modalPersonaIndex, setModalPersonaIndex] = useState<number | null>(null);

  // Library state
  const [libraryModalOpen, setLibraryModalOpen] = useState(false);
  const [libraryPersonas, setLibraryPersonas] = useState<LibraryPersona[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [editingLibraryPersona, setEditingLibraryPersona] = useState<LibraryPersona | null>(null);
  const [editingLibraryData, setEditingLibraryData] = useState<LibraryPersona | null>(null); // Local edits

  useEffect(() => {
    fetch("/api/settings")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || `Failed to load settings (${res.status})`);
        }
        setState({
          provider: data.provider ?? "anthropic",
          providers: data.providers ?? ["anthropic", "openai", "google"],
          apiKeys: data.apiKeys ?? [],
          model: data.model ?? "",
          availableModels: data.availableModels ?? [],
        });
              })
      .catch((err) => setMessage({ type: "error", text: err?.message || "Failed to load settings" }))
      .finally(() => setLoading(false));

    fetch("/api/personas")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || `Failed to load personas (${res.status})`);
        }
        setPersonasData(data);
      })
      .catch((err) => setPersonasMessage({ type: "error", text: err?.message || "Failed to load personas" }))
      .finally(() => setPersonasLoading(false));
  }, []);

  const updateSettings = (body: Record<string, unknown>) => {
    setSaving(true);
    setMessage(null);
    return fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `Failed to save (${res.status})`);
        setState({
          provider: data.provider ?? "anthropic",
          providers: data.providers ?? ["anthropic", "openai", "google"],
          apiKeys: data.apiKeys ?? [],
          model: data.model ?? "",
          availableModels: data.availableModels ?? [],
        });
                return data;
      })
      .finally(() => setSaving(false));
  };

  const handleSelectProvider = (newProvider: ProviderType) => {
    updateSettings({ provider: newProvider })
      .then(() => {
        setProviderModalOpen(false);
        setMessage({ type: "ok", text: `Switched to ${PROVIDER_INFO[newProvider].name}` });
      })
      .catch((err) => setMessage({ type: "error", text: err?.message || "Failed to switch provider" }));
  };

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKeyName.trim()) return;
    // If editing existing key and no new value, just update the name
    const payload: Record<string, unknown> = { apiKeyName };
    if (apiKey.trim()) {
      payload.apiKey = apiKey;
    }
    // If renaming, need to delete old key
    if (editingApiKey && editingApiKey !== apiKeyName) {
      payload.renameFrom = editingApiKey;
    }
    updateSettings(payload)
      .then(() => {
        setApiKey("");
        setApiKeyName("API_KEY");
        setEditingApiKey(null);
        setAddingApiKey(false);
        setMessage({ type: "ok", text: "API key saved." });
      })
      .catch((err) => setMessage({ type: "error", text: err?.message || "Failed to save" }));
  };

  const handleDeleteApiKey = (keyName: string) => {
    if (!confirm(`Are you sure you want to delete ${keyName}?`)) return;
    updateSettings({ deleteApiKey: true, apiKeyName: keyName })
      .then(() => setMessage({ type: "ok", text: "API key deleted." }))
      .catch((err) => setMessage({ type: "error", text: err?.message || "Failed to delete" }));
  };

  const handleSelectModel = (modelId: string) => {
    updateSettings({ model: modelId })
      .then(() => {
        setModelModalOpen(false);
        setMessage({ type: "ok", text: "Model updated." });
      })
      .catch((err) => setMessage({ type: "error", text: err?.message || "Failed to save" }));
  };

  const handleAddCustomModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customModelId.trim() || !customModelName.trim()) return;
    setSaving(true);
    setMessage(null);
    fetch("/api/settings/custom-models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider: state.provider,
        modelId: customModelId.trim(),
        modelName: customModelName.trim(),
        description: customModelDesc.trim() || undefined,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to add model");
        setState((prev) => ({ ...prev, availableModels: data.availableModels ?? prev.availableModels }));
        setCustomModelId("");
        setCustomModelName("");
        setCustomModelDesc("");
        setAddingCustomModel(false);
        setMessage({ type: "ok", text: "Model added." });
      })
      .catch((err) => setMessage({ type: "error", text: err?.message || "Failed to add" }))
      .finally(() => setSaving(false));
  };

  const handleDeleteCustomModel = (modelId: string) => {
    if (!confirm(`Delete "${modelId}"?`)) return;
    setSaving(true);
    setMessage(null);
    fetch(`/api/settings/custom-models/${state.provider}/${encodeURIComponent(modelId)}`, {
      method: "DELETE",
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to delete");
        setState((prev) => ({ ...prev, availableModels: data.availableModels ?? prev.availableModels }));
        setMessage({ type: "ok", text: "Model deleted." });
      })
      .catch((err) => setMessage({ type: "error", text: err?.message || "Failed to delete" }))
      .finally(() => setSaving(false));
  };

  const handlePersonasSave = (): Promise<boolean> => {
    setPersonasSaving(true);
    setPersonasMessage(null);
    return fetch("/api/personas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(personasData),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `Failed to save (${res.status})`);
        setPersonasData(data);
        setPersonasMessage({ type: "ok", text: "Personas saved successfully." });
        return true;
      })
      .catch((err) => {
        setPersonasMessage({ type: "error", text: err?.message || "Failed to save personas" });
        return false;
      })
      .finally(() => setPersonasSaving(false));
  };

  const updatePersona = (index: number, field: keyof Persona, value: string | string[]) => {
    setPersonasData((prev) => ({
      ...prev,
      personas: prev.personas.map((p, i) =>
        i === index ? { ...p, [field]: value } : p
      ),
    }));
  };

  const loadLibrary = () => {
    setLibraryLoading(true);
    fetch("/api/personas/library")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to load library");
        setLibraryPersonas(data.presets || []);
      })
      .catch((err) => setPersonasMessage({ type: "error", text: err?.message || "Failed to load library" }))
      .finally(() => setLibraryLoading(false));
  };

  const handleAddPersona = (personaId: string) => {
    setPersonasSaving(true);
    fetch("/api/personas/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personaId }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to add persona");
        setPersonasData(data);
        setPersonasMessage({ type: "ok", text: "Persona added!" });
        loadLibrary(); // Refresh library to update isActive
      })
      .catch((err) => setPersonasMessage({ type: "error", text: err?.message || "Failed to add persona" }))
      .finally(() => setPersonasSaving(false));
  };

  const handleRemovePersona = (personaId: string) => {
    if (!confirm("Remove this persona from your active set?")) return;
    setPersonasSaving(true);
    fetch(`/api/personas/${personaId}`, { method: "DELETE" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to remove persona");
        setPersonasData(data);
        setPersonasMessage({ type: "ok", text: "Persona removed." });
        loadLibrary(); // Refresh library to update isActive
      })
      .catch((err) => setPersonasMessage({ type: "error", text: err?.message || "Failed to remove persona" }))
      .finally(() => setPersonasSaving(false));
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingLibraryPersona) setEditingLibraryPersona(null);
        else if (modalPersonaIndex !== null) setModalPersonaIndex(null);
        else if (libraryModalOpen) setLibraryModalOpen(false);
        else if (modelModalOpen) setModelModalOpen(false);
        else if (providerModalOpen) setProviderModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalPersonaIndex, modelModalOpen, providerModalOpen, libraryModalOpen, editingLibraryPersona]);

  if (loading) {
    return (
      <div className="animate-fade-in">
        <h1 className="font-display text-2xl font-semibold mb-8">Settings</h1>
        <p className="text-muted text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h1 className="font-display text-2xl font-semibold mb-8">Settings</h1>

      {/* API Keys Section */}
      <section className="mb-8">
        <h2 className="font-display text-lg font-semibold mb-4">API Keys</h2>
        <p className="text-sm text-secondary mb-4">
          Stored in <code className="font-mono text-xs bg-border-light px-1.5 py-0.5 rounded">server/data/settings.json</code>.
        </p>
        <div className="space-y-2">
          {state.apiKeys.map((keyEntry) => (
            <div key={keyEntry.name}>
              {editingApiKey === keyEntry.name ? (
                <form onSubmit={handleSaveApiKey} className="p-4 rounded-lg border border-accent/30 bg-accent/5 space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    <label className="block">
                      <span className="text-xs text-secondary block mb-1">Key Name (JSON key)</span>
                      <input
                        type="text"
                        className="input-minimal w-full font-mono text-sm"
                        value={apiKeyName}
                        onChange={(e) => setApiKeyName(e.target.value)}
                        placeholder="API_KEY"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-secondary block mb-1">API Key Value</span>
                      <input
                        type="password"
                        className="input-minimal w-full"
                        placeholder="Enter new API key (leave empty to keep current)"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        autoComplete="off"
                        autoFocus
                      />
                      <span className="text-xs text-muted mt-1 block">Current: {keyEntry.masked}</span>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary text-sm" disabled={saving || !apiKeyName.trim()}>
                      {saving ? "Saving..." : "Save"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary text-sm"
                      onClick={() => { setEditingApiKey(null); setApiKey(""); setApiKeyName("API_KEY"); }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border-light bg-surface">
                  <code className="font-mono text-xs text-accent shrink-0">{keyEntry.name}</code>
                  <code className="flex-1 font-mono text-sm text-secondary truncate">{keyEntry.masked}</code>
                  <button
                    type="button"
                    className="text-sm text-secondary hover:text-primary shrink-0"
                    onClick={() => { setEditingApiKey(keyEntry.name); setApiKeyName(keyEntry.name); }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-sm text-accent hover:text-accent/80 shrink-0"
                    onClick={() => handleDeleteApiKey(keyEntry.name)}
                    disabled={saving}
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Add new API key */}
          {addingApiKey ? (
            <form onSubmit={handleSaveApiKey} className="p-4 rounded-lg border border-dashed border-accent/30 bg-accent/5 space-y-3">
              <div className="grid grid-cols-1 gap-3">
                <label className="block">
                  <span className="text-xs text-secondary block mb-1">Key Name (JSON key)</span>
                  <input
                    type="text"
                    className="input-minimal w-full font-mono text-sm"
                    value={apiKeyName}
                    onChange={(e) => setApiKeyName(e.target.value)}
                    placeholder="API_KEY"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-secondary block mb-1">API Key Value</span>
                  <input
                    type="password"
                    className="input-minimal w-full"
                    placeholder="Enter API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    autoComplete="off"
                    autoFocus
                  />
                </label>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary text-sm" disabled={saving || !apiKey.trim() || !apiKeyName.trim()}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => { setAddingApiKey(false); setApiKey(""); setApiKeyName("API_KEY"); }}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="w-full p-3 rounded-lg border border-dashed border-border-light text-sm text-secondary hover:border-border-dark hover:text-primary transition-colors"
              onClick={() => setAddingApiKey(true)}
            >
              + Add API Key
            </button>
          )}
        </div>
      </section>

      {/* Provider Section */}
      <section className="mb-8">
        <h2 className="font-display text-lg font-semibold mb-4">AI Provider</h2>
        <p className="text-sm text-secondary mb-4">
          Choose your LLM provider. Make sure you have the corresponding API key configured.
        </p>
        <div className="relative">
          <button
            type="button"
            className="w-full flex items-center justify-between gap-2 p-3 rounded-lg border border-border-light bg-surface hover:border-border-dark transition-colors text-left"
            onClick={() => setProviderModalOpen(!providerModalOpen)}
          >
            <div>
              <span className="font-medium text-sm block">
                {PROVIDER_INFO[state.provider]?.name || state.provider}
              </span>
              <span className="text-xs text-muted">
                Requires {PROVIDER_INFO[state.provider]?.keyName}
              </span>
            </div>
            <span className={`text-secondary transition-transform ${providerModalOpen ? "rotate-180" : ""}`}>▼</span>
          </button>

          {/* Provider Dropdown */}
          {providerModalOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProviderModalOpen(false)}
              />
              <div
                className="absolute top-full left-0 right-0 z-50 mt-2 rounded-xl border border-white/20 shadow-2xl backdrop-blur-xl bg-white/80"
                style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
              >
                <div className="p-2">
                  {state.providers.map((p) => (
                    <button
                      key={p}
                      type="button"
                      className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                        state.provider === p
                          ? "bg-accent/15 border border-accent/30"
                          : "hover:bg-white/50 border border-transparent"
                      }`}
                      onClick={() => handleSelectProvider(p)}
                      disabled={saving}
                    >
                      <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        state.provider === p ? "border-accent" : "border-border-dark"
                      }`}>
                        {state.provider === p && <span className="w-2 h-2 rounded-full bg-accent" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-sm block">{PROVIDER_INFO[p]?.name}</span>
                        <span className="text-xs text-muted">Requires {PROVIDER_INFO[p]?.keyName}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Model Section */}
      <section className="mb-8">
        <h2 className="font-display text-lg font-semibold mb-4">Model</h2>
        <p className="text-sm text-secondary mb-4">
          Available models for {PROVIDER_INFO[state.provider]?.name || state.provider}.
        </p>
        <div className="relative">
          <button
            type="button"
            className="w-full flex items-center justify-between gap-2 p-3 rounded-lg border border-border-light bg-surface hover:border-border-dark transition-colors text-left"
            onClick={() => setModelModalOpen(!modelModalOpen)}
          >
            <div>
              <span className="font-medium text-sm block">
                {state.availableModels.find((m) => m.id === state.model)?.name || state.model}
              </span>
              <span className="text-xs text-muted">
                {state.availableModels.find((m) => m.id === state.model)?.description}
              </span>
            </div>
            <span className={`text-secondary transition-transform ${modelModalOpen ? "rotate-180" : ""}`}>▼</span>
          </button>

          {/* Model Dropdown - Glassmorphism */}
          {modelModalOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setModelModalOpen(false)}
              />
              <div
                className="absolute top-full left-0 right-0 z-50 mt-2 rounded-xl border border-white/20 shadow-2xl backdrop-blur-xl bg-white/80"
                style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
              >
                <div className="p-2 max-h-[50vh] overflow-y-auto">
                  {state.availableModels.map((m) => (
                    <div key={m.id} className="flex items-start gap-2">
                      <button
                        type="button"
                        className={`flex-1 flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                          state.model === m.id
                            ? "bg-accent/15 border border-accent/30"
                            : "hover:bg-white/50 border border-transparent"
                        }`}
                        onClick={() => handleSelectModel(m.id)}
                        disabled={saving}
                      >
                        <span className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          state.model === m.id ? "border-accent" : "border-border-dark"
                        }`}>
                          {state.model === m.id && <span className="w-2 h-2 rounded-full bg-accent" />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-sm">{m.name}</span>
                            {m.latency && (
                              <span className="text-xs text-muted shrink-0">{m.latency}</span>
                            )}
                          </div>
                          {m.description && (
                            <p className="text-xs text-secondary mt-0.5">{m.description}</p>
                          )}
                          {(m.inputPrice || m.outputPrice || m.contextWindow || m.maxOutput) && (
                            <div className="flex gap-3 mt-1 text-xs text-muted">
                              {m.inputPrice && m.outputPrice && (
                                <span>{m.inputPrice} in / {m.outputPrice} out</span>
                              )}
                              {m.contextWindow && <span>Context: {m.contextWindow}</span>}
                              {m.maxOutput && <span>Output: {m.maxOutput}</span>}
                            </div>
                          )}
                        </div>
                      </button>
                      {m.isCustom && (
                        <button
                          type="button"
                          className="mt-3 text-xs text-red-500 hover:text-red-700 p-1"
                          onClick={() => handleDeleteCustomModel(m.id)}
                          disabled={saving}
                          title="Delete model"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}

                  {/* Add New Model Version */}
                  <div className="mt-2 pt-2 border-t border-white/30">
                    {addingCustomModel ? (
                      <form onSubmit={handleAddCustomModel} className="p-3 space-y-2">
                        <label className="block">
                          <span className="text-xs text-secondary block mb-1">Model ID (exact API name)</span>
                          <input
                            type="text"
                            className="input-minimal w-full text-sm font-mono"
                            value={customModelId}
                            onChange={(e) => setCustomModelId(e.target.value)}
                            placeholder="e.g., gpt-5.3"
                            autoFocus
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs text-secondary block mb-1">Display Name</span>
                          <input
                            type="text"
                            className="input-minimal w-full text-sm"
                            value={customModelName}
                            onChange={(e) => setCustomModelName(e.target.value)}
                            placeholder="e.g., GPT-5.3"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs text-secondary block mb-1">Description (optional)</span>
                          <input
                            type="text"
                            className="input-minimal w-full text-sm"
                            value={customModelDesc}
                            onChange={(e) => setCustomModelDesc(e.target.value)}
                            placeholder="e.g., $2.50/MTok in, $10/MTok out"
                          />
                        </label>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="submit"
                            className="btn-primary text-xs"
                            disabled={saving || !customModelId.trim() || !customModelName.trim()}
                          >
                            {saving ? "Adding..." : "Add"}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary text-xs"
                            onClick={() => {
                              setAddingCustomModel(false);
                              setCustomModelId("");
                              setCustomModelName("");
                              setCustomModelDesc("");
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <button
                        type="button"
                        className="w-full p-3 text-sm text-secondary hover:text-primary text-left"
                        onClick={() => setAddingCustomModel(true)}
                      >
                        + Add New Model Version
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {message && (
        <p className={`text-sm mb-8 ${message.type === "ok" ? "text-secondary" : "text-accent"}`}>
          {message.text}
        </p>
      )}

      {/* Personas Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold">Personas</h2>
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => {
              loadLibrary();
              setLibraryModalOpen(true);
            }}
          >
            Edit Persona List
          </button>
        </div>
        <p className="text-sm text-secondary mb-6">
          Your active AI commenters. Click a card to view details and edit.
        </p>

        {personasLoading ? (
          <p className="text-muted text-sm">Loading personas...</p>
        ) : (
          <>
            {/* Active Personas Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {personasData.personas.map((persona, index) => (
                <button
                  key={persona.id}
                  type="button"
                  className="p-4 rounded-xl border border-border-light bg-surface text-left transition-all hover:shadow-md hover:border-border-dark focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 relative overflow-hidden"
                  onClick={() => setModalPersonaIndex(index)}
                >
                  <div
                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                    style={{ backgroundColor: persona.color }}
                  />
                  <div className="mb-2">
                    <PersonaIcon emoji={persona.emoji} color={persona.color} size={28} />
                  </div>
                  <span className="font-display font-semibold block truncate text-sm" style={{ color: persona.color }}>
                    {persona.name}
                  </span>
                  <span className="text-muted text-xs block truncate">{persona.role}</span>
                </button>
              ))}
            </div>

            {personasMessage && (
              <p className={`text-sm mt-4 ${personasMessage.type === "ok" ? "text-secondary" : "text-accent"}`}>
                {personasMessage.text}
              </p>
            )}

            {/* Edit modal - Glassmorphism */}
            {modalPersonaIndex !== null && personasData.personas[modalPersonaIndex] && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
                onClick={(e) => e.target === e.currentTarget && setModalPersonaIndex(null)}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
              >
                <div
                  className="rounded-2xl border border-white/20 shadow-2xl backdrop-blur-xl bg-white/80 max-h-[90vh] w-full max-w-2xl flex flex-col"
                  style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-white/30 flex items-center justify-between shrink-0 rounded-t-2xl bg-white/40">
                    <h3 id="modal-title" className="font-display text-lg font-semibold text-primary">
                      Edit: {personasData.personas[modalPersonaIndex].name}
                    </h3>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-white/50 transition-colors"
                      onClick={() => setModalPersonaIndex(null)}
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  <div className="p-4 overflow-y-auto space-y-4">
                    {/* Basic Info */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Basic Info</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <label className="block">
                          <span className="text-xs text-secondary block mb-1">Name</span>
                          <input
                            type="text"
                            className="input-minimal w-full text-sm"
                            value={personasData.personas[modalPersonaIndex].name}
                            onChange={(e) => updatePersona(modalPersonaIndex, "name", e.target.value)}
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs text-secondary block mb-1">Role (custom label)</span>
                          <input
                            type="text"
                            className="input-minimal w-full text-sm"
                            value={personasData.personas[modalPersonaIndex].role}
                            onChange={(e) => updatePersona(modalPersonaIndex, "role", e.target.value)}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Style */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Style</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <label className="block">
                          <span className="text-xs text-secondary block mb-1">Emoji</span>
                          <input
                            type="text"
                            className="input-minimal w-full text-sm"
                            value={personasData.personas[modalPersonaIndex].emoji}
                            onChange={(e) => updatePersona(modalPersonaIndex, "emoji", e.target.value)}
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs text-secondary block mb-1">Color</span>
                          <input
                            type="text"
                            className="input-minimal w-full text-sm"
                            value={personasData.personas[modalPersonaIndex].color}
                            onChange={(e) => updatePersona(modalPersonaIndex, "color", e.target.value)}
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs text-secondary block mb-1">Background</span>
                          <input
                            type="text"
                            className="input-minimal w-full text-sm"
                            value={personasData.personas[modalPersonaIndex].bgColor}
                            onChange={(e) => updatePersona(modalPersonaIndex, "bgColor", e.target.value)}
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs text-secondary block mb-1">Border</span>
                          <input
                            type="text"
                            className="input-minimal w-full text-sm"
                            value={personasData.personas[modalPersonaIndex].borderColor}
                            onChange={(e) => updatePersona(modalPersonaIndex, "borderColor", e.target.value)}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Prompt */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Prompt</h4>
                      <label className="block">
                        <span className="text-xs text-secondary block mb-1">System Prompt ({personasData.personas[modalPersonaIndex].promptFile})</span>
                        <textarea
                          className="input-minimal w-full text-sm font-mono min-h-[280px]"
                          value={personasData.personas[modalPersonaIndex].promptContent}
                          onChange={(e) => updatePersona(modalPersonaIndex, "promptContent", e.target.value)}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="p-4 border-t border-white/30 flex gap-2 justify-end shrink-0 rounded-b-2xl bg-white/40">
                    <button
                      type="button"
                      className="btn-secondary text-sm"
                      onClick={() => setModalPersonaIndex(null)}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className="btn-primary text-sm"
                      disabled={personasSaving}
                      onClick={() => {
                        handlePersonasSave().then((ok) => ok && setModalPersonaIndex(null));
                      }}
                    >
                      {personasSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Library Modal */}
            {libraryModalOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
                onClick={(e) => e.target === e.currentTarget && setLibraryModalOpen(false)}
                role="dialog"
                aria-modal="true"
                aria-labelledby="library-modal-title"
              >
                <div
                  className="rounded-2xl border border-white/20 shadow-2xl backdrop-blur-xl bg-white/80 max-h-[90vh] w-full max-w-4xl flex flex-col"
                  style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-white/30 flex items-center justify-between shrink-0 rounded-t-2xl bg-white/40">
                    <h3 id="library-modal-title" className="font-display text-lg font-semibold text-primary">
                      Edit Persona List
                    </h3>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-white/50 transition-colors"
                      onClick={() => setLibraryModalOpen(false)}
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  <div className="p-4 overflow-y-auto">
                    {libraryLoading ? (
                      <p className="text-muted text-sm text-center py-8">Loading library...</p>
                    ) : (
                      <>
                        {/* Active Personas Section */}
                        {libraryPersonas.filter(p => p.isActive).length > 0 && (
                          <div className="mb-6">
                            <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-green-500"></span>
                              Active Personas ({libraryPersonas.filter(p => p.isActive).length})
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {libraryPersonas.filter(p => p.isActive).map((persona) => (
                                <div
                                  key={persona.id}
                                  className="p-4 rounded-xl border border-border-light bg-white transition-all hover:shadow-md cursor-pointer relative overflow-hidden ring-2 ring-green-400/50 ring-offset-2"
                                  onClick={() => { setEditingLibraryPersona(persona); setEditingLibraryData({ ...persona }); }}
                                >
                                  <div
                                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                                    style={{ backgroundColor: persona.color }}
                                  />
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <span className="text-2xl">{persona.emoji}</span>
                                    <button
                                      type="button"
                                      className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemovePersona(persona.id);
                                      }}
                                      disabled={personasSaving}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                  <span
                                    className="font-display font-semibold block truncate"
                                    style={{ color: persona.color }}
                                  >
                                    {persona.name}
                                  </span>
                                  <span className="text-muted text-xs block">{persona.role}</span>
                                  <p className="text-xs text-secondary mt-2 line-clamp-2">
                                    {persona.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Available Personas Section */}
                        {libraryPersonas.filter(p => !p.isActive).length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                              Available Personas ({libraryPersonas.filter(p => !p.isActive).length})
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                              {libraryPersonas.filter(p => !p.isActive).map((persona) => (
                                <div
                                  key={persona.id}
                                  className="p-4 rounded-xl border border-border-light bg-white transition-all hover:shadow-md cursor-pointer relative overflow-hidden"
                                  onClick={() => { setEditingLibraryPersona(persona); setEditingLibraryData({ ...persona }); }}
                                >
                                  <div
                                    className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                                    style={{ backgroundColor: persona.color }}
                                  />
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <span className="text-2xl">{persona.emoji}</span>
                                    <button
                                      type="button"
                                      className="text-xs px-2 py-1 rounded-full bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddPersona(persona.id);
                                      }}
                                      disabled={personasSaving}
                                    >
                                      + Add
                                    </button>
                                  </div>
                                  <span
                                    className="font-display font-semibold block truncate"
                                    style={{ color: persona.color }}
                                  >
                                    {persona.name}
                                  </span>
                                  <span className="text-muted text-xs block">{persona.role}</span>
                                  <p className="text-xs text-secondary mt-2 line-clamp-2">
                                    {persona.description}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <div className="p-4 border-t border-white/30 flex justify-end shrink-0 rounded-b-2xl bg-white/40">
                    <button
                      type="button"
                      className="btn-secondary text-sm"
                      onClick={() => setLibraryModalOpen(false)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Library Persona Edit Modal */}
            {editingLibraryPersona && editingLibraryData && (
              <div
                className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
                onClick={(e) => e.target === e.currentTarget && setEditingLibraryPersona(null)}
                role="dialog"
                aria-modal="true"
                aria-labelledby="library-edit-modal-title"
              >
                <div
                  className="rounded-2xl border border-white/20 shadow-2xl backdrop-blur-xl bg-white/80 max-h-[90vh] w-full max-w-2xl flex flex-col"
                  style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-white/30 flex items-center justify-between shrink-0 rounded-t-2xl bg-white/40">
                    <h3 id="library-edit-modal-title" className="font-display text-lg font-semibold text-primary">
                      Edit: {editingLibraryData.name}
                    </h3>
                    <button
                      type="button"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-white/50 transition-colors"
                      onClick={() => setEditingLibraryPersona(null)}
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  <div className="p-4 overflow-y-auto space-y-4">
                    {/* Basic Info */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Basic Info</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <label className="block">
                          <span className="text-xs text-secondary block mb-1">Name</span>
                          <input
                            type="text"
                            className="input-minimal w-full text-sm"
                            value={editingLibraryData.name}
                            onChange={(e) => setEditingLibraryData({ ...editingLibraryData, name: e.target.value })}
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs text-secondary block mb-1">Role</span>
                          <input
                            type="text"
                            className="input-minimal w-full text-sm"
                            value={editingLibraryData.role}
                            onChange={(e) => setEditingLibraryData({ ...editingLibraryData, role: e.target.value })}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Style */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Style</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <label className="block">
                          <span className="text-xs text-secondary block mb-1">Emoji</span>
                          <input
                            type="text"
                            className="input-minimal w-full text-sm"
                            value={editingLibraryData.emoji}
                            onChange={(e) => setEditingLibraryData({ ...editingLibraryData, emoji: e.target.value })}
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs text-secondary block mb-1">Color</span>
                          <input
                            type="text"
                            className="input-minimal w-full text-sm"
                            value={editingLibraryData.color}
                            onChange={(e) => setEditingLibraryData({ ...editingLibraryData, color: e.target.value })}
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs text-secondary block mb-1">Background</span>
                          <input
                            type="text"
                            className="input-minimal w-full text-sm"
                            value={editingLibraryData.bgColor}
                            onChange={(e) => setEditingLibraryData({ ...editingLibraryData, bgColor: e.target.value })}
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs text-secondary block mb-1">Border</span>
                          <input
                            type="text"
                            className="input-minimal w-full text-sm"
                            value={editingLibraryData.borderColor}
                            onChange={(e) => setEditingLibraryData({ ...editingLibraryData, borderColor: e.target.value })}
                          />
                        </label>
                      </div>
                    </div>

                    {/* Prompt */}
                    <div>
                      <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Prompt</h4>
                      <label className="block">
                        <span className="text-xs text-secondary block mb-1">System Prompt ({editingLibraryData.promptFile})</span>
                        <textarea
                          className="input-minimal w-full text-sm font-mono min-h-[280px]"
                          value={editingLibraryData.promptContent}
                          onChange={(e) => setEditingLibraryData({ ...editingLibraryData, promptContent: e.target.value })}
                        />
                      </label>
                    </div>
                  </div>
                  <div className="p-4 border-t border-white/30 flex gap-2 justify-between shrink-0 rounded-b-2xl bg-white/40">
                    <div>
                      {editingLibraryPersona.isActive ? (
                        <button
                          type="button"
                          className="text-sm px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                          onClick={() => {
                            handleRemovePersona(editingLibraryPersona.id);
                            setEditingLibraryPersona(null);
                          }}
                          disabled={personasSaving}
                        >
                          Remove from Active
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="text-sm px-3 py-1.5 rounded-lg bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
                          onClick={() => {
                            handleAddPersona(editingLibraryPersona.id);
                            setEditingLibraryPersona(null);
                          }}
                          disabled={personasSaving}
                        >
                          + Add to Active
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn-secondary text-sm"
                        onClick={() => setEditingLibraryPersona(null)}
                      >
                        Close
                      </button>
                      {editingLibraryPersona.isActive && (
                        <button
                          type="button"
                          className="btn-primary text-sm"
                          disabled={personasSaving}
                          onClick={() => {
                            // Find the persona in personasData and update it
                            const idx = personasData.personas.findIndex(p => p.id === editingLibraryData.id);
                            if (idx !== -1) {
                              const updated = {
                                ...personasData,
                                personas: personasData.personas.map((p, i) =>
                                  i === idx ? {
                                    ...p,
                                    name: editingLibraryData.name,
                                    role: editingLibraryData.role,
                                    emoji: editingLibraryData.emoji,
                                    color: editingLibraryData.color,
                                    bgColor: editingLibraryData.bgColor,
                                    borderColor: editingLibraryData.borderColor,
                                    promptContent: editingLibraryData.promptContent,
                                  } : p
                                ),
                              };
                              setPersonasData(updated);
                              setPersonasSaving(true);
                              fetch("/api/personas", {
                                method: "PUT",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify(updated),
                              })
                                .then(async (res) => {
                                  const data = await res.json().catch(() => ({}));
                                  if (!res.ok) throw new Error(data?.error || "Failed to save");
                                  setPersonasData(data);
                                  setPersonasMessage({ type: "ok", text: "Persona saved!" });
                                  loadLibrary();
                                  setEditingLibraryPersona(null);
                                })
                                .catch((err) => setPersonasMessage({ type: "error", text: err?.message || "Failed to save" }))
                                .finally(() => setPersonasSaving(false));
                            }
                          }}
                        >
                          {personasSaving ? "Saving..." : "Save"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Data Storage Section */}
      <section className="mt-8">
        <h2 className="font-display text-lg font-semibold mb-4">Data Storage</h2>
        <p className="text-sm text-secondary mb-4">
          Posts and comments are stored locally in{" "}
          <code className="font-mono text-xs bg-border-light px-1.5 py-0.5 rounded">server/data/</code>.
        </p>
        <button
          type="button"
          className="btn-secondary text-sm"
          onClick={() => {
            fetch("/api/open-data-folder", { method: "POST" })
              .then((res) => res.json())
              .then((data) => {
                if (data.error) setMessage({ type: "error", text: data.error });
              })
              .catch(() => setMessage({ type: "error", text: "Failed to open folder" }));
          }}
        >
          Open Data Folder
        </button>
      </section>
    </div>
  );
}
