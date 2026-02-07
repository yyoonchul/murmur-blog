import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SETTINGS_PATH = path.join(__dirname, "..", "data", "settings.json");

function readSettings(): Record<string, string> {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
    const data = JSON.parse(raw);
    return typeof data === "object" && data !== null ? data : {};
  } catch {
    return {};
  }
}

export function writeSettings(settings: Record<string, string>) {
  fs.mkdirSync(path.dirname(SETTINGS_PATH), { recursive: true });
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), "utf-8");
}

/**
 * Get API key for server use (e.g. when calling the LLM).
 * Order: settings.json first (saved from Settings UI), then process.env (.env).
 * No need to "register" the key as an env var — just use this when you need it.
 *
 * @example
 *   const apiKey = getApiKey("ANTHROPIC_API_KEY");
 *   if (!apiKey) throw new Error("API key not configured");
 *   const client = new Anthropic({ apiKey });
 */
export function getApiKey(key: string): string | undefined {
  const settings = readSettings();
  if (settings[key]) return settings[key];
  return process.env[key];
}

export { readSettings };
