import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PERSONA_DIR = path.join(__dirname, "..", "data", "persona");
const PERSONAS_JSON = path.join(PERSONA_DIR, "personas.json");

export interface Persona {
  id: string;
  name: string;
  role: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
  promptFile: string;
}

export interface PersonaWithPrompt extends Persona {
  promptContent: string;
}

export interface PersonasData {
  personas: PersonaWithPrompt[];
  feedbackOrder: string[];
  feedbackOrderReason: string;
}

interface PersonasJsonData {
  personas: Persona[];
  feedbackOrder: string[];
  feedbackOrderReason: string;
}

/**
 * Validate that a promptFile is safe (no directory traversal, ends with .md)
 */
function isSafePromptFile(promptFile: string): boolean {
  if (!promptFile || typeof promptFile !== "string") return false;
  if (!promptFile.endsWith(".md")) return false;
  if (promptFile.includes("..") || promptFile.includes("/") || promptFile.includes("\\")) return false;
  return true;
}

/**
 * Resolve prompt file path safely
 */
function resolvePromptPath(promptFile: string): string | null {
  if (!isSafePromptFile(promptFile)) return null;
  const resolved = path.join(PERSONA_DIR, promptFile);
  const relative = path.relative(PERSONA_DIR, resolved);
  if (relative.startsWith("..")) return null;
  return resolved;
}

/**
 * Read personas.json and attach promptContent from each .md file
 */
export function readPersonas(): PersonasData {
  let data: PersonasJsonData;
  try {
    const raw = fs.readFileSync(PERSONAS_JSON, "utf-8");
    data = JSON.parse(raw);
  } catch {
    return { personas: [], feedbackOrder: [], feedbackOrderReason: "" };
  }

  const personas: PersonaWithPrompt[] = (data.personas || []).map((p) => {
    let promptContent = "";
    const promptPath = resolvePromptPath(p.promptFile);
    if (promptPath) {
      try {
        promptContent = fs.readFileSync(promptPath, "utf-8");
      } catch {
        promptContent = "";
      }
    }
    return { ...p, promptContent };
  });

  return {
    personas,
    feedbackOrder: data.feedbackOrder || [],
    feedbackOrderReason: data.feedbackOrderReason || "",
  };
}

/**
 * Write personas data: personas.json (without promptContent) + each .md file
 */
export function writePersonas(payload: PersonasData): void {
  const { personas, feedbackOrder, feedbackOrderReason } = payload;

  // Write each .md file
  for (const persona of personas) {
    const promptPath = resolvePromptPath(persona.promptFile);
    if (promptPath && typeof persona.promptContent === "string") {
      fs.writeFileSync(promptPath, persona.promptContent, "utf-8");
    }
  }

  // Strip promptContent and write personas.json
  const jsonData: PersonasJsonData = {
    personas: personas.map(({ promptContent, ...rest }) => rest),
    feedbackOrder,
    feedbackOrderReason,
  };

  fs.writeFileSync(PERSONAS_JSON, JSON.stringify(jsonData, null, 2), "utf-8");
}
