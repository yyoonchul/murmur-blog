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

const PROVIDERS: { id: ProviderType; name: string; keyName: string; description: string }[] = [
  { id: "anthropic", name: "Anthropic", keyName: "ANTHROPIC_API_KEY", description: "Claude models" },
  { id: "openai", name: "OpenAI", keyName: "OPENAI_API_KEY", description: "GPT models" },
  { id: "google", name: "Google", keyName: "GOOGLE_API_KEY", description: "Gemini models" },
];

type SettingsState = {
  provider: ProviderType;
  providers: ProviderType[];
  apiKeys: ApiKeyEntry[];
  model: string;
  availableModels: ModelOption[];
  allProviderModels: Record<string, ModelOption[]>;
  providerModels: Record<string, string>;
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

type SettingsTab = "providers" | "personas" | "data";

const TABS: { id: SettingsTab; label: string }[] = [
  { id: "providers", label: "Providers" },
  { id: "personas", label: "Personas" },
  { id: "data", label: "Data" },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("providers");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<SettingsState>({
    provider: "anthropic",
    providers: ["anthropic", "openai", "google"],
    apiKeys: [],
    model: "",
    availableModels: [],
    allProviderModels: {},
    providerModels: {},
  });
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({
    ANTHROPIC_API_KEY: "",
    OPENAI_API_KEY: "",
    GOOGLE_API_KEY: "",
  });
  const [openModelDropdown, setOpenModelDropdown] = useState<ProviderType | null>(null);
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

  // Library state
  const [libraryPersonas, setLibraryPersonas] = useState<LibraryPersona[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [editingLibraryPersona, setEditingLibraryPersona] = useState<LibraryPersona | null>(null);
  const [editingLibraryData, setEditingLibraryData] = useState<LibraryPersona | null>(null);

  const applyStateFromData = (data: Record<string, unknown>) => {
    setState((prev) => ({
      provider: (data.provider as ProviderType) ?? prev.provider,
      providers: (data.providers as ProviderType[]) ?? prev.providers,
      apiKeys: (data.apiKeys as ApiKeyEntry[]) ?? prev.apiKeys,
      model: (data.model as string) ?? prev.model,
      availableModels: (data.availableModels as ModelOption[]) ?? prev.availableModels,
      allProviderModels: (data.allProviderModels as Record<string, ModelOption[]>) ?? prev.allProviderModels,
      providerModels: (data.providerModels as Record<string, string>) ?? prev.providerModels,
    }));
  };

  useEffect(() => {
    fetch("/api/settings")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || `Failed to load settings (${res.status})`);
        }
        applyStateFromData(data);
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

    // Load library personas when component mounts
    loadLibrary();
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
        applyStateFromData(data);
        return data;
      })
      .finally(() => setSaving(false));
  };

  // --- Provider & Model handlers ---

  const handleSelectProvider = (newProvider: ProviderType) => {
    const providerName = PROVIDERS.find((p) => p.id === newProvider)?.name || newProvider;
    updateSettings({ provider: newProvider })
      .then(() => setMessage({ type: "ok", text: `Switched to ${providerName}` }))
      .catch((err) => setMessage({ type: "error", text: err?.message || "Failed to switch provider" }));
  };

  const handleSaveApiKey = (keyName: string) => {
    const value = apiKeyInputs[keyName]?.trim() || "";
    if (!value) {
      setMessage({ type: "error", text: "API key is empty." });
      return;
    }
    updateSettings({ apiKeyName: keyName, apiKey: value })
      .then(() => {
        setApiKeyInputs((prev) => ({ ...prev, [keyName]: "" }));
        setMessage({ type: "ok", text: `${keyName} saved.` });
      })
      .catch((err) => setMessage({ type: "error", text: err?.message || "Failed to save" }));
  };

  const handleDeleteApiKey = (keyName: string) => {
    if (!confirm(`Are you sure you want to delete ${keyName}?`)) return;
    updateSettings({ deleteApiKey: true, apiKeyName: keyName })
      .then(() => {
        setApiKeyInputs((prev) => ({ ...prev, [keyName]: "" }));
        setMessage({ type: "ok", text: `${keyName} deleted.` });
      })
      .catch((err) => setMessage({ type: "error", text: err?.message || "Failed to delete" }));
  };

  const handleSelectModel = (provider: ProviderType, modelId: string) => {
    updateSettings({ providerModel: { provider, model: modelId } })
      .then(() => {
        setOpenModelDropdown(null);
        setMessage({ type: "ok", text: "Model updated." });
      })
      .catch((err) => setMessage({ type: "error", text: err?.message || "Failed to save" }));
  };

  const handleAddCustomModel = (provider: ProviderType, e: React.FormEvent) => {
    e.preventDefault();
    if (!customModelId.trim() || !customModelName.trim()) return;
    setSaving(true);
    setMessage(null);
    fetch("/api/settings/custom-models", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        provider,
        modelId: customModelId.trim(),
        modelName: customModelName.trim(),
        description: customModelDesc.trim() || undefined,
      }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to add model");
        setState((prev) => ({
          ...prev,
          allProviderModels: {
            ...prev.allProviderModels,
            [provider]: data.availableModels ?? prev.allProviderModels[provider],
          },
          availableModels: provider === prev.provider ? (data.availableModels ?? prev.availableModels) : prev.availableModels,
        }));
        setCustomModelId("");
        setCustomModelName("");
        setCustomModelDesc("");
        setAddingCustomModel(false);
        setMessage({ type: "ok", text: "Model added." });
      })
      .catch((err) => setMessage({ type: "error", text: err?.message || "Failed to add" }))
      .finally(() => setSaving(false));
  };

  const handleDeleteCustomModel = (provider: ProviderType, modelId: string) => {
    if (!confirm(`Delete "${modelId}"?`)) return;
    setSaving(true);
    setMessage(null);
    fetch(`/api/settings/custom-models/${provider}/${encodeURIComponent(modelId)}`, {
      method: "DELETE",
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || "Failed to delete");
        setState((prev) => ({
          ...prev,
          allProviderModels: {
            ...prev.allProviderModels,
            [provider]: data.availableModels ?? prev.allProviderModels[provider],
          },
          availableModels: provider === prev.provider ? (data.availableModels ?? prev.availableModels) : prev.availableModels,
        }));
        setMessage({ type: "ok", text: "Model deleted." });
      })
      .catch((err) => setMessage({ type: "error", text: err?.message || "Failed to delete" }))
      .finally(() => setSaving(false));
  };

  // --- Persona handlers ---

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
        loadLibrary();
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
        loadLibrary();
      })
      .catch((err) => setPersonasMessage({ type: "error", text: err?.message || "Failed to remove persona" }))
      .finally(() => setPersonasSaving(false));
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (editingLibraryPersona) setEditingLibraryPersona(null);
        else if (openModelDropdown) setOpenModelDropdown(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openModelDropdown, editingLibraryPersona]);

  const apiKeyEntries = new Map(state.apiKeys.map((entry) => [entry.name, entry]));

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
      <h1 className="font-display text-2xl font-semibold mb-6">Settings</h1>

      {/* Tab Navigation */}
      <nav className="flex gap-1 mb-8 border-b border-border-light">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`px-4 py-2.5 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? "text-primary"
                : "text-muted hover:text-secondary"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute left-0 right-0 bottom-0 h-[2px] bg-primary rounded-full" />
            )}
          </button>
        ))}
      </nav>

      {/* Providers Tab */}
      {activeTab === "providers" && (
      <section>
        <h2 className="font-display text-lg font-semibold mb-2">AI Providers</h2>
        <p className="text-sm text-secondary mb-5">
          Configure your LLM providers. Select one as the active provider for AI-generated comments.
        </p>

        <div className="space-y-4">
          {PROVIDERS.map((providerInfo) => {
            const pid = providerInfo.id;
            const isActive = state.provider === pid;
            const savedKey = apiKeyEntries.get(providerInfo.keyName);
            const hasKey = !!savedKey;
            const models = state.allProviderModels[pid] || [];
            const selectedModelId = state.providerModels[pid] || "";
            const selectedModel = models.find((m) => m.id === selectedModelId);
            const inputValue = apiKeyInputs[providerInfo.keyName] || "";
            const isModelOpen = openModelDropdown === pid;

            return (
              <div
                key={pid}
                className={`rounded-xl border transition-all ${
                  isActive
                    ? "border-accent/40 shadow-sm"
                    : "border-border-light"
                }`}
              >
                {/* Card Header - click to select provider */}
                <div
                  className={`p-4 flex items-center gap-3 cursor-pointer rounded-t-xl transition-colors ${
                    isActive ? "bg-accent/5" : "bg-surface hover:bg-surface/80"
                  }`}
                  onClick={() => {
                    if (!isActive && hasKey) {
                      handleSelectProvider(pid);
                    } else if (!isActive && !hasKey) {
                      setMessage({ type: "error", text: `Set ${providerInfo.keyName} first to use ${providerInfo.name}.` });
                    }
                  }}
                >
                  {/* Radio indicator */}
                  <span
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isActive ? "border-accent" : "border-border-dark"
                    }`}
                  >
                    {isActive && <span className="w-2.5 h-2.5 rounded-full bg-accent" />}
                  </span>

                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm">{providerInfo.name}</span>
                    <span className="text-xs text-muted ml-2">{providerInfo.description}</span>
                  </div>

                  {/* Status badge */}
                  {isActive && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-accent/15 text-accent font-medium">
                      Active
                    </span>
                  )}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      hasKey
                        ? "bg-green-100 text-green-700"
                        : "bg-orange-100 text-orange-600"
                    }`}
                  >
                    {hasKey ? "Connected" : "No API key"}
                  </span>
                </div>

                {/* Card Body */}
                <div className="px-4 pb-4 space-y-4 border-t border-border-light/50">
                  {/* API Key */}
                  <div className="pt-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-secondary">API Key</span>
                      {savedKey && (
                        <span className="text-xs text-muted font-mono">{savedKey.masked}</span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        className="input-minimal flex-1"
                        placeholder={hasKey ? "Enter new key to replace" : `Enter ${providerInfo.keyName}`}
                        value={inputValue}
                        onChange={(e) =>
                          setApiKeyInputs((prev) => ({ ...prev, [providerInfo.keyName]: e.target.value }))
                        }
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        className="btn-primary text-sm"
                        disabled={saving || !inputValue.trim()}
                        onClick={() => handleSaveApiKey(providerInfo.keyName)}
                      >
                        {saving ? "..." : "Save"}
                      </button>
                      {savedKey && (
                        <button
                          type="button"
                          className="btn-secondary text-sm"
                          onClick={() => handleDeleteApiKey(providerInfo.keyName)}
                          disabled={saving}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    {!hasKey && (
                      <p className="text-xs text-accent mt-1.5">
                        API key is required to use this provider.
                      </p>
                    )}
                  </div>

                  {/* Model Selector */}
                  <div>
                    <span className="text-xs font-medium text-secondary block mb-1.5">Model</span>
                    <div className="relative">
                      <button
                        type="button"
                        className="w-full flex items-center justify-between gap-2 p-2.5 rounded-lg border border-border-light bg-white hover:border-border-dark transition-colors text-left text-sm"
                        onClick={() => setOpenModelDropdown(isModelOpen ? null : pid)}
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-medium block truncate">
                            {selectedModel?.name || selectedModelId || "Select a model"}
                          </span>
                          {selectedModel?.description && (
                            <span className="text-xs text-muted block truncate">{selectedModel.description}</span>
                          )}
                        </div>
                        <span className={`text-secondary text-xs transition-transform ${isModelOpen ? "rotate-180" : ""}`}>▼</span>
                      </button>

                      {/* Model Dropdown */}
                      {isModelOpen && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setOpenModelDropdown(null)}
                          />
                          <div
                            className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-white/20 shadow-2xl backdrop-blur-xl bg-white/90"
                            style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
                          >
                            <div className="p-1.5 max-h-[40vh] overflow-y-auto">
                              {models.map((m) => (
                                <div key={m.id} className="flex items-start gap-1">
                                  <button
                                    type="button"
                                    className={`flex-1 flex items-start gap-2.5 p-2.5 rounded-lg text-left transition-all text-sm ${
                                      selectedModelId === m.id
                                        ? "bg-accent/15 border border-accent/30"
                                        : "hover:bg-white/60 border border-transparent"
                                    }`}
                                    onClick={() => handleSelectModel(pid, m.id)}
                                    disabled={saving}
                                  >
                                    <span className={`mt-0.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                      selectedModelId === m.id ? "border-accent" : "border-border-dark"
                                    }`}>
                                      {selectedModelId === m.id && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="font-medium">{m.name}</span>
                                        {m.latency && <span className="text-xs text-muted shrink-0">{m.latency}</span>}
                                      </div>
                                      {m.description && <p className="text-xs text-secondary mt-0.5">{m.description}</p>}
                                      {(m.inputPrice || m.outputPrice) && (
                                        <div className="flex gap-3 mt-0.5 text-xs text-muted">
                                          {m.inputPrice && m.outputPrice && (
                                            <span>{m.inputPrice} in / {m.outputPrice} out</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                  {m.isCustom && (
                                    <button
                                      type="button"
                                      className="mt-2.5 text-xs text-red-500 hover:text-red-700 p-1"
                                      onClick={() => handleDeleteCustomModel(pid, m.id)}
                                      disabled={saving}
                                      title="Delete model"
                                    >
                                      ×
                                    </button>
                                  )}
                                </div>
                              ))}

                              {/* Add Custom Model */}
                              <div className="mt-1 pt-1 border-t border-white/30">
                                {addingCustomModel && openModelDropdown === pid ? (
                                  <form onSubmit={(e) => handleAddCustomModel(pid, e)} className="p-2.5 space-y-2">
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
                                        placeholder="e.g., Latest model"
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
                                    className="w-full p-2.5 text-xs text-secondary hover:text-primary text-left"
                                    onClick={() => setAddingCustomModel(true)}
                                  >
                                    + Add Custom Model
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      {message && (
        <p className={`text-sm mt-6 ${message.type === "ok" ? "text-secondary" : "text-accent"}`}>
          {message.text}
        </p>
      )}
      </section>
      )}

      {/* Personas Tab */}
      {activeTab === "personas" && (
      <section>
        <h2 className="font-display text-xl font-semibold mb-2">Personas</h2>
        <p className="text-sm text-secondary mb-6">
          Manage your AI commenters. Click a card to view details and edit.
        </p>

        {personasLoading || libraryLoading ? (
          <p className="text-muted text-sm">Loading personas...</p>
        ) : (
          <>
            {/* Active Personas Section */}
            {libraryPersonas.filter(p => p.isActive).length > 0 && (
              <div className="mb-8">
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Active Personas ({libraryPersonas.filter(p => p.isActive).length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {libraryPersonas.filter(p => p.isActive).map((persona) => {
                    const index = personasData.personas.findIndex(p => p.id === persona.id);
                    return (
                      <div
                        key={persona.id}
                        className="p-4 rounded-xl border border-border-light bg-surface transition-all hover:shadow-md hover:border-border-dark relative overflow-hidden ring-2 ring-green-400/50 ring-offset-2"
                      >
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                          style={{ backgroundColor: persona.color }}
                        />
                        <button
                          type="button"
                          className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center bg-red-100 text-red-600 hover:bg-red-200 transition-colors z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemovePersona(persona.id);
                          }}
                          disabled={personasSaving}
                          title="비활성화"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="w-full text-left"
                          onClick={() => {
                            setEditingLibraryPersona(persona);
                            setEditingLibraryData({ ...persona });
                          }}
                        >
                          <div className="mb-2">
                            <PersonaIcon emoji={persona.emoji} color={persona.color} size={28} />
                          </div>
                          <span className="font-display font-semibold block truncate text-sm" style={{ color: persona.color }}>
                            {persona.name}
                          </span>
                          <span className="text-muted text-xs block truncate">{persona.role}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Available Personas Section */}
            {libraryPersonas.filter(p => !p.isActive).length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-muted uppercase tracking-wide mb-3">
                  Available Personas ({libraryPersonas.filter(p => !p.isActive).length})
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                  {libraryPersonas.filter(p => !p.isActive).map((persona) => (
                    <div
                      key={persona.id}
                      className="p-4 rounded-xl border border-border-light bg-surface transition-all hover:shadow-md hover:border-border-dark relative overflow-hidden"
                    >
                      <div
                        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
                        style={{ backgroundColor: persona.color }}
                      />
                      <button
                        type="button"
                        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center bg-accent/20 text-accent hover:bg-accent/30 transition-colors z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddPersona(persona.id);
                        }}
                        disabled={personasSaving}
                        title="활성화"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => {
                          setEditingLibraryPersona(persona);
                          setEditingLibraryData({ ...persona });
                        }}
                      >
                        <div className="mb-2">
                          <PersonaIcon emoji={persona.emoji} color={persona.color} size={28} />
                        </div>
                        <span className="font-display font-semibold block truncate text-sm" style={{ color: persona.color }}>
                          {persona.name}
                        </span>
                        <span className="text-muted text-xs block truncate">{persona.role}</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {personasMessage && (
              <p className={`text-sm mt-4 ${personasMessage.type === "ok" ? "text-secondary" : "text-accent"}`}>
                {personasMessage.text}
              </p>
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
                      <button
                        type="button"
                        className="btn-primary text-sm"
                        disabled={personasSaving}
                        onClick={() => {
                          if (editingLibraryPersona.isActive) {
                            // Update active persona
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
                          } else {
                            // For available personas, we need to update the library file
                            // For now, just reload the library to reflect any changes
                            // TODO: Add API endpoint to update library personas
                            setPersonasMessage({ type: "error", text: "Library personas cannot be edited directly. Add to active personas first." });
                          }
                        }}
                      >
                        {personasSaving ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </section>
      )}

      {/* Data Tab */}
      {activeTab === "data" && (
      <section>
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
      )}
    </div>
  );
}
