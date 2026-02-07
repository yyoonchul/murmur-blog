import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { getApiKey, readSettings, writeSettings } from "./lib/settings.js";
import { readPersonas, writePersonas } from "./lib/personas.js";
import postsRouter from "./routes/posts.js";

dotenv.config();

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
  res.json({ status: "ok", message: "Murmur server is running" });
});

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const DEFAULT_AVAILABLE_MODELS = [
  { id: "claude-opus-4-6-20250415", name: "Claude Opus 4.6", description: "Our most intelligent model", inputPrice: "$5 / MTok", outputPrice: "$25 / MTok" },
  { id: "claude-sonnet-4-5-20250929", name: "Claude Sonnet 4.5", description: "Best speed and intelligence", inputPrice: "$3 / MTok", outputPrice: "$15 / MTok" },
  { id: "claude-haiku-4-5-20251001", name: "Claude Haiku 4.5", description: "Fastest model", inputPrice: "$1 / MTok", outputPrice: "$5 / MTok" },
];

app.get("/api/settings", onlyLocalhost, (_req, res) => {
  const settings = readSettings();
  const availableModels = settings.AVAILABLE_MODELS || DEFAULT_AVAILABLE_MODELS;
  const reservedKeys = ["MODEL", "AVAILABLE_MODELS"];
  const apiKeys = Object.entries(settings)
    .filter(([key, value]) => !reservedKeys.includes(key) && typeof value === "string")
    .map(([name, value]) => ({
      name,
      masked: typeof value === "string" && value.length > 11
        ? `${value.slice(0, 7)}...${value.slice(-4)}`
        : "***",
    }));

  res.json({
    apiKeys,
    model: settings.MODEL || DEFAULT_MODEL,
    availableModels,
  });
});

app.put("/api/settings", onlyLocalhost, (req, res) => {
  const { apiKey, apiKeyName, model, deleteApiKey, renameFrom } = req.body ?? {};
  const settings = readSettings();
  const keyName = apiKeyName || "ANTHROPIC_API_KEY";

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

  // Build apiKeys array from all keys that look like API keys (exclude MODEL, AVAILABLE_MODELS)
  const updated = readSettings();
  const availableModels = updated.AVAILABLE_MODELS || DEFAULT_AVAILABLE_MODELS;
  const reservedKeys = ["MODEL", "AVAILABLE_MODELS"];
  const apiKeys = Object.entries(updated)
    .filter(([key, value]) => !reservedKeys.includes(key) && typeof value === "string")
    .map(([name, value]) => ({
      name,
      masked: typeof value === "string" && value.length > 11
        ? `${value.slice(0, 7)}...${value.slice(-4)}`
        : "***",
    }));

  res.json({
    apiKeys,
    model: updated.MODEL || DEFAULT_MODEL,
    availableModels,
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

app.listen(PORT, () => {
  console.log(`🤫 Murmur server running on http://localhost:${PORT}`);
});
