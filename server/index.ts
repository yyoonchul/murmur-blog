import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { platform } from "os";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { readSettings, writeSettings } from "./lib/settings.js";
import { readPersonas, writePersonas, readLibraryWithStatus, addPersonaFromLibrary, removePersona } from "./lib/personas.js";
import { getProvider, getProviderTypes } from "./lib/llm/index.js";
import type { ProviderType } from "./lib/llm/types.js";
import postsRouter from "./routes/posts.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = process.env.NODE_ENV !== "production";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use("/api/posts", postsRouter);

/** Allow only localhost to access settings (avoids exposure when device is on a network). Skip check in dev or when ALLOW_SETTINGS_REMOTE=1. */
function onlyLocalhost(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (process.env.NODE_ENV !== "production" || process.env.ALLOW_SETTINGS_REMOTE === "1") {
    return next();
  }
  const ip = req.socket.remoteAddress ?? "";
  const isLocal =
    ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1" || ip.startsWith("::ffff:127.");
  if (!isLocal) {
    res.status(403).json({ error: "Settings are only available from this machine" });
    return;
  }
  next();
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Monolog server is running" });
});

const RESERVED_SETTINGS_KEYS = ["MODEL", "AVAILABLE_MODELS", "PROVIDER", "CUSTOM_MODELS"];

app.get("/api/settings", onlyLocalhost, (_req, res) => {
  const settings = readSettings();
  const currentProvider = (settings.PROVIDER || "anthropic") as ProviderType;
  const provider = getProvider(currentProvider);

  // Get models from the current provider
  const availableModels = provider.getAvailableModels();

  // Build API keys list (exclude reserved keys)
  const apiKeys = Object.entries(settings)
    .filter(([key, value]) => !RESERVED_SETTINGS_KEYS.includes(key) && typeof value === "string")
    .map(([name, value]) => ({
      name,
      masked: typeof value === "string" && value.length > 11
        ? `${value.slice(0, 7)}...${value.slice(-4)}`
        : "***",
    }));

  res.json({
    provider: currentProvider,
    providers: getProviderTypes(),
    apiKeys,
    model: settings.MODEL || provider.getDefaultModel(),
    availableModels,
  });
});

app.put("/api/settings", onlyLocalhost, (req, res) => {
  const { apiKey, apiKeyName, model, deleteApiKey, renameFrom, provider: newProvider } = req.body ?? {};
  const settings = readSettings();
  const keyName = apiKeyName || "ANTHROPIC_API_KEY";

  // Handle provider change
  if (newProvider && getProviderTypes().includes(newProvider)) {
    settings.PROVIDER = newProvider;
    // Reset model to the new provider's default
    const providerInstance = getProvider(newProvider as ProviderType);
    settings.MODEL = providerInstance.getDefaultModel();
  }

  if (deleteApiKey === true) {
    delete settings[keyName];
  } else if (renameFrom && renameFrom !== keyName) {
    // Rename: copy old value to new key, delete old key
    const oldValue = settings[renameFrom];
    if (oldValue) {
      settings[keyName] = apiKey?.trim() || oldValue;
      delete settings[renameFrom];
    }
  } else if (typeof apiKey === "string" && apiKey.trim()) {
    settings[keyName] = apiKey.trim();
  }

  if (typeof model === "string" && model.trim()) {
    settings.MODEL = model.trim();
  }
  writeSettings(settings);

  // Build response
  const updated = readSettings();
  const currentProvider = (updated.PROVIDER || "anthropic") as ProviderType;
  const providerInstance = getProvider(currentProvider);
  const availableModels = providerInstance.getAvailableModels();

  const apiKeys = Object.entries(updated)
    .filter(([key, value]) => !RESERVED_SETTINGS_KEYS.includes(key) && typeof value === "string")
    .map(([name, value]) => ({
      name,
      masked: typeof value === "string" && value.length > 11
        ? `${value.slice(0, 7)}...${value.slice(-4)}`
        : "***",
    }));

  res.json({
    provider: currentProvider,
    providers: getProviderTypes(),
    apiKeys,
    model: updated.MODEL || providerInstance.getDefaultModel(),
    availableModels,
  });
});

// Custom model endpoints
app.post("/api/settings/custom-models", onlyLocalhost, (req, res) => {
  const { provider, modelId, modelName, description } = req.body ?? {};
  if (!provider || !modelId || !modelName) {
    res.status(400).json({ error: "provider, modelId, and modelName are required" });
    return;
  }
  if (!getProviderTypes().includes(provider)) {
    res.status(400).json({ error: "Invalid provider" });
    return;
  }

  const settings = readSettings();
  if (!settings.CUSTOM_MODELS) {
    settings.CUSTOM_MODELS = { anthropic: [], openai: [], google: [] };
  }
  if (!settings.CUSTOM_MODELS[provider]) {
    settings.CUSTOM_MODELS[provider] = [];
  }

  // Check for duplicate
  const existing = settings.CUSTOM_MODELS[provider].find((m: { id: string }) => m.id === modelId);
  if (existing) {
    res.status(400).json({ error: "Model ID already exists" });
    return;
  }

  const newModel: { id: string; name: string; description?: string } = { id: modelId, name: modelName };
  if (description?.trim()) {
    newModel.description = description.trim();
  }
  settings.CUSTOM_MODELS[provider].push(newModel);
  writeSettings(settings);

  // Return updated settings
  const updated = readSettings();
  const currentProvider = (updated.PROVIDER || "anthropic") as ProviderType;
  const providerInstance = getProvider(currentProvider);
  const availableModels = providerInstance.getAvailableModels();

  res.json({
    provider: currentProvider,
    availableModels,
    customModels: updated.CUSTOM_MODELS,
  });
});

app.delete("/api/settings/custom-models/:provider/:modelId", onlyLocalhost, (req, res) => {
  const { provider, modelId } = req.params;
  if (!getProviderTypes().includes(provider as ProviderType)) {
    res.status(400).json({ error: "Invalid provider" });
    return;
  }

  const settings = readSettings();
  if (!settings.CUSTOM_MODELS || !settings.CUSTOM_MODELS[provider]) {
    res.status(404).json({ error: "Model not found" });
    return;
  }

  const index = settings.CUSTOM_MODELS[provider].findIndex((m: { id: string }) => m.id === modelId);
  if (index === -1) {
    res.status(404).json({ error: "Model not found" });
    return;
  }

  settings.CUSTOM_MODELS[provider].splice(index, 1);
  writeSettings(settings);

  // Return updated settings
  const updated = readSettings();
  const currentProvider = (updated.PROVIDER || "anthropic") as ProviderType;
  const providerInstance = getProvider(currentProvider);
  const availableModels = providerInstance.getAvailableModels();

  res.json({
    provider: currentProvider,
    availableModels,
    customModels: updated.CUSTOM_MODELS,
  });
});

app.get("/api/personas", onlyLocalhost, (_req, res) => {
  const data = readPersonas();
  res.json(data);
});

app.put("/api/personas", onlyLocalhost, (req, res) => {
  const { personas, feedbackOrder, feedbackOrderReason } = req.body ?? {};
  if (!Array.isArray(personas)) {
    res.status(400).json({ error: "personas must be an array" });
    return;
  }
  writePersonas({ personas, feedbackOrder, feedbackOrderReason });
  const saved = readPersonas();
  res.json(saved);
});

app.get("/api/personas/library", onlyLocalhost, (_req, res) => {
  const library = readLibraryWithStatus();
  res.json(library);
});

app.post("/api/personas/add", onlyLocalhost, (req, res) => {
  const { personaId } = req.body ?? {};
  if (!personaId) {
    res.status(400).json({ error: "personaId required" });
    return;
  }
  const result = addPersonaFromLibrary(personaId);
  if (!result) {
    res.status(400).json({ error: "Persona not found or already active" });
    return;
  }
  res.json(result);
});

app.delete("/api/personas/:id", onlyLocalhost, (req, res) => {
  const result = removePersona(req.params.id);
  if (!result) {
    res.status(404).json({ error: "Persona not found" });
    return;
  }
  res.json(result);
});

app.post("/api/open-data-folder", onlyLocalhost, (_req, res) => {
  const dataPath = path.join(__dirname, "data");
  const plat = platform();

  const command =
    plat === "darwin"
      ? `open "${dataPath}"`
      : plat === "win32"
        ? `explorer "${dataPath}"`
        : `xdg-open "${dataPath}"`;

  exec(command, (error) => {
    if (error) {
      console.error("Failed to open data folder:", error);
      res.status(500).json({ error: "Failed to open folder" });
      return;
    }
    res.json({ success: true });
  });
});

async function start() {
  if (isDev) {
    const vite = await createViteServer({ server: { middlewareMode: true } });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(__dirname, "../dist");
    app.use(express.static(dist));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(dist, "index.html"));
    });
  }

  app.listen(PORT, () => {
    console.log(`🤫 Monolog server running on http://localhost:${PORT}`);
  });
}

start();
