import { useState, useEffect, useRef } from "react";

type SettingsState = {
  apiKeyConfigured: boolean;
  apiKeyMasked: string | null;
};

interface Persona {
  id: string;
  name: string;
  role: string;
  tone: string;
  description: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  promptFile: string;
  feedbackFocus: string[];
  personality: string;
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
    apiKeyConfigured: false,
    apiKeyMasked: null,
  });
  const [apiKey, setApiKey] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);

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
        setState({ apiKeyConfigured: data.apiKeyConfigured, apiKeyMasked: data.apiKeyMasked ?? null });
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

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: apiKey || undefined }),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `Failed to save (${res.status})`);
        setState({ apiKeyConfigured: data.apiKeyConfigured, apiKeyMasked: data.apiKeyMasked ?? null });
        setApiKey("");
        setMessage({ type: "ok", text: "Settings saved. Key is stored on the server (settings.json), not in .env." });
      })
      .catch((err) => setMessage({ type: "error", text: err?.message || "Failed to save settings" }))
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

  const scrollCarousel = (dir: "prev" | "next") => {
    const el = carouselRef.current;
    if (!el) return;
    const cardWidth = 160;
    el.scrollBy({ left: dir === "prev" ? -cardWidth : cardWidth, behavior: "smooth" });
  };

  useEffect(() => {
    if (modalPersonaIndex === null) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalPersonaIndex(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalPersonaIndex]);

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

      {/* API Key Section */}
      <section className="mb-12">
        <p className="text-sm text-secondary mb-6">
          API key is stored in the server's <code className="font-mono text-xs bg-border-light px-1.5 py-0.5 rounded">data/settings.json</code>. The server uses it instead of (or in addition to) <code className="font-mono text-xs bg-border-light px-1.5 py-0.5 rounded">.env</code>.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <label className="block">
            <span className="text-sm text-secondary block mb-2">API Key (e.g. Anthropic)</span>
            <input
              type="password"
              className="input-minimal w-full"
              placeholder={state.apiKeyConfigured ? "Enter new key to replace" : "Enter your API key"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoComplete="off"
            />
            {state.apiKeyMasked && (
              <p className="text-muted text-xs mt-1">Current: {state.apiKeyMasked}</p>
            )}
          </label>
          {message && (
            <p className={`text-sm ${message.type === "ok" ? "text-secondary" : "text-accent"}`}>
              {message.text}
            </p>
          )}
          <button type="submit" className="btn-primary text-sm" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </form>
      </section>

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
                    <span className="text-3xl block mb-2">{persona.emoji}</span>
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

            {/* Edit modal */}
            {modalPersonaIndex !== null && personasData.personas[modalPersonaIndex] && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
                onClick={(e) => e.target === e.currentTarget && setModalPersonaIndex(null)}
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
              >
                <div
                  className="bg-page rounded-xl border border-border-light shadow-xl max-h-[90vh] w-full max-w-2xl flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-4 border-b border-border-light flex items-center justify-between shrink-0">
                    <h3 id="modal-title" className="font-display text-lg font-semibold">
                      Edit: {personasData.personas[modalPersonaIndex].name}
                    </h3>
                    <button
                      type="button"
                      className="w-8 h-8 rounded flex items-center justify-center text-secondary hover:text-primary hover:bg-border-light"
                      onClick={() => setModalPersonaIndex(null)}
                      aria-label="Close"
                    >
                      ×
                    </button>
                  </div>
                  <div className="p-4 overflow-y-auto space-y-4">
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
                        <span className="text-xs text-secondary block mb-1">Role</span>
                        <input
                          type="text"
                          className="input-minimal w-full text-sm"
                          value={personasData.personas[modalPersonaIndex].role}
                          onChange={(e) => updatePersona(modalPersonaIndex, "role", e.target.value)}
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs text-secondary block mb-1">Tone</span>
                        <input
                          type="text"
                          className="input-minimal w-full text-sm"
                          value={personasData.personas[modalPersonaIndex].tone}
                          onChange={(e) => updatePersona(modalPersonaIndex, "tone", e.target.value)}
                        />
                      </label>
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
                      <label className="block">
                        <span className="text-xs text-secondary block mb-1">Personality</span>
                        <input
                          type="text"
                          className="input-minimal w-full text-sm"
                          value={personasData.personas[modalPersonaIndex].personality}
                          onChange={(e) => updatePersona(modalPersonaIndex, "personality", e.target.value)}
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-xs text-secondary block mb-1">Description</span>
                      <input
                        type="text"
                        className="input-minimal w-full text-sm"
                        value={personasData.personas[modalPersonaIndex].description}
                        onChange={(e) => updatePersona(modalPersonaIndex, "description", e.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-secondary block mb-1">Feedback Focus (comma-separated)</span>
                      <input
                        type="text"
                        className="input-minimal w-full text-sm"
                        value={personasData.personas[modalPersonaIndex].feedbackFocus.join(", ")}
                        onChange={(e) =>
                          updatePersona(
                            modalPersonaIndex,
                            "feedbackFocus",
                            e.target.value.split(",").map((s) => s.trim()).filter(Boolean)
                          )
                        }
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs text-secondary block mb-1">System Prompt ({personasData.personas[modalPersonaIndex].promptFile})</span>
                      <textarea
                        className="input-minimal w-full text-sm font-mono min-h-[200px]"
                        value={personasData.personas[modalPersonaIndex].promptContent}
                        onChange={(e) => updatePersona(modalPersonaIndex, "promptContent", e.target.value)}
                      />
                    </label>
                  </div>
                  <div className="p-4 border-t border-border-light flex gap-2 justify-end shrink-0">
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
