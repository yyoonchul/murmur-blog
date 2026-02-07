import { useState, useEffect, useRef } from "react";

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
};

type ApiKeyEntry = {
  name: string;
  masked: string;
};

type SettingsState = {
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

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState<SettingsState>({
    apiKeys: [],
    model: "",
    availableModels: [],
  });
  const [apiKey, setApiKey] = useState("");
  const [apiKeyName, setApiKeyName] = useState("ANTHROPIC_API_KEY");
  const [selectedModel, setSelectedModel] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [editingApiKey, setEditingApiKey] = useState<string | null>(null); // null or key name being edited
  const [addingApiKey, setAddingApiKey] = useState(false);
  const [modelModalOpen, setModelModalOpen] = useState(false);

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
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || `Failed to load settings (${res.status})`);
        }
        setState({
          apiKeys: data.apiKeys ?? [],
          model: data.model ?? "",
          availableModels: data.availableModels ?? [],
        });
        setSelectedModel(data.model ?? "");
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
          apiKeys: data.apiKeys ?? [],
          model: data.model ?? "",
          availableModels: data.availableModels ?? [],
        });
        setSelectedModel(data.model ?? "");
        return data;
      })
      .finally(() => setSaving(false));
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
        setApiKeyName("ANTHROPIC_API_KEY");
        setEditingApiKey(null);
        setAddingApiKey(false);
        setMessage({ type: "ok", text: "API key saved." });
      })
      .catch((err) => setMessage({ type: "error", text: err?.message || "Failed to save" }));
  };

  const handleDeleteApiKey = (keyName: string) => {
    if (!confirm(`${keyName}를 삭제하시겠습니까?`)) return;
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

  const scrollCarousel = (dir: "prev" | "next") => {
    const el = carouselRef.current;
    if (!el) return;
    const cardWidth = 160;
    el.scrollBy({ left: dir === "prev" ? -cardWidth : cardWidth, behavior: "smooth" });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (modalPersonaIndex !== null) setModalPersonaIndex(null);
        if (modelModalOpen) setModelModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalPersonaIndex, modelModalOpen]);

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
                        placeholder="ANTHROPIC_API_KEY"
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
                      onClick={() => { setEditingApiKey(null); setApiKey(""); setApiKeyName("ANTHROPIC_API_KEY"); }}
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
                    placeholder="ANTHROPIC_API_KEY"
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
                  onClick={() => { setAddingApiKey(false); setApiKey(""); setApiKeyName("ANTHROPIC_API_KEY"); }}
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

      {/* Model Section */}
      <section className="mb-8">
        <h2 className="font-display text-lg font-semibold mb-4">Model</h2>
        <p className="text-sm text-secondary mb-4">
          Stored in <code className="font-mono text-xs bg-border-light px-1.5 py-0.5 rounded">server/data/settings.json</code>.
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
                    <button
                      key={m.id}
                      type="button"
                      className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
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
                        <div className="flex gap-3 mt-1 text-xs text-muted">
                          {m.inputPrice && m.outputPrice && (
                            <span>{m.inputPrice} in / {m.outputPrice} out</span>
                          )}
                          {m.contextWindow && <span>Context: {m.contextWindow}</span>}
                          {m.maxOutput && <span>Output: {m.maxOutput}</span>}
                        </div>
                      </div>
                    </button>
                  ))}
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

      {/* Personas Section: Carousel + Modal */}
      <section>
        <h2 className="font-display text-xl font-semibold mb-4">Personas</h2>
        <p className="text-sm text-secondary mb-6">
          Click a card to edit. Data in <code className="font-mono text-xs bg-border-light px-1.5 py-0.5 rounded">server/data/persona/</code>.
        </p>

        {personasLoading ? (
          <p className="text-muted text-sm">Loading personas...</p>
        ) : (
          <>
            <div className="relative flex items-center gap-2">
              <button
                type="button"
                className="shrink-0 w-10 h-10 rounded-full border border-border-light flex items-center justify-center text-secondary hover:text-primary hover:border-border-dark transition-colors"
                onClick={() => scrollCarousel("prev")}
                aria-label="Previous"
              >
                ←
              </button>
              <div
                ref={carouselRef}
                className="flex gap-4 overflow-x-auto scroll-smooth py-2 flex-1 [&::-webkit-scrollbar]:hidden"
                style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
              >
                {personasData.personas.map((persona, index) => (
                  <button
                    key={persona.id}
                    type="button"
                    className="shrink-0 w-36 p-4 rounded-xl border-2 text-left transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
                    style={{
                      borderColor: persona.borderColor,
                      backgroundColor: persona.bgColor,
                      scrollSnapAlign: "start",
                    }}
                    onClick={() => setModalPersonaIndex(index)}
                  >
                    <div className="mb-2">
                      <PersonaIcon emoji={persona.emoji} color={persona.color} size={28} />
                    </div>
                    <span className="font-display font-semibold block truncate" style={{ color: persona.color }}>
                      {persona.name}
                    </span>
                    <span className="text-muted text-xs block truncate">{persona.role}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="shrink-0 w-10 h-10 rounded-full border border-border-light flex items-center justify-center text-secondary hover:text-primary hover:border-border-dark transition-colors"
                onClick={() => scrollCarousel("next")}
                aria-label="Next"
              >
                →
              </button>
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
                      <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">기본 정보</h4>
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
                          <span className="text-xs text-secondary block mb-1">Role (커스텀 라벨)</span>
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
                      <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">스타일</h4>
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
                      <h4 className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">프롬프트</h4>
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
          </>
        )}
      </section>
    </div>
  );
}
