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

app.get("/api/settings", onlyLocalhost, (_req, res) => {
  const settings = readSettings();
  const apiKey = settings.ANTHROPIC_API_KEY;
  res.json({
    apiKeyConfigured: Boolean(apiKey),
    apiKeyMasked: apiKey ? `${apiKey.slice(0, 7)}...${apiKey.slice(-4)}` : null,
  });
});

app.put("/api/settings", onlyLocalhost, (req, res) => {
  const { apiKey } = req.body ?? {};
  const settings = readSettings();
  if (typeof apiKey === "string" && apiKey.trim()) {
    settings.ANTHROPIC_API_KEY = apiKey.trim();
    writeSettings(settings);
  }
  const updated = readSettings();
  res.json({
    apiKeyConfigured: Boolean(updated.ANTHROPIC_API_KEY),
    apiKeyMasked: updated.ANTHROPIC_API_KEY
      ? `${updated.ANTHROPIC_API_KEY.slice(0, 7)}...${updated.ANTHROPIC_API_KEY.slice(-4)}`
      : null,
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
