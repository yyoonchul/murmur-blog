import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PERSONA_DIR = path.join(__dirname, "..", "data", "persona");
const PERSONAS_JSON = path.join(PERSONA_DIR, "personas.json");
const LIBRARY_JSON = path.join(PERSONA_DIR, "library", "library.json");

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
 * Allows "library/filename.md" format for library presets
 */
function isSafePromptFile(promptFile: string): boolean {
  if (!promptFile || typeof promptFile !== "string") return false;
  if (!promptFile.endsWith(".md")) return false;
  if (promptFile.includes("..")) return false;
  // Allow only library/ subdirectory or root-level files
  const parts = promptFile.split("/");
  if (parts.length > 2) return false; // Too many levels
  if (parts.length === 2 && parts[0] !== "library") return false; // Only library/ allowed
  if (promptFile.includes("\\")) return false;
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

  // Write each .md file (only for non-library personas)
  for (const persona of personas) {
    // Don't write to library/ directory - those are read-only presets
    if (persona.promptFile.startsWith("library/")) continue;
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

// ========== Library Functions ==========

export interface LibraryPersona extends Persona {
  description: string;
}

export interface PersonaLibrary {
  presets: LibraryPersona[];
}

export interface LibraryPersonaWithStatus extends LibraryPersona {
  isActive: boolean;
  promptContent: string;
}

/**
 * Read the persona library (presets)
 */
export function readLibrary(): PersonaLibrary {
  try {
    const raw = fs.readFileSync(LIBRARY_JSON, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { presets: [] };
  }
}

/**
 * Get library with active status and prompt content.
 * For active personas, overlay any edits from personas.json on top of library defaults.
 */
export function readLibraryWithStatus(): { presets: LibraryPersonaWithStatus[] } {
  const library = readLibrary();
  const active = readPersonas();
  const activeMap = new Map(active.personas.map((p) => [p.id, p]));

  return {
    presets: library.presets.map((p) => {
      const activePersona = activeMap.get(p.id);
      let promptContent = "";
      const promptPath = resolvePromptPath(activePersona?.promptFile ?? p.promptFile);
      if (promptPath) {
        try {
          promptContent = fs.readFileSync(promptPath, "utf-8");
        } catch {
          promptContent = "";
        }
      }
      if (activePersona) {
        return {
          ...p,
          name: activePersona.name,
          role: activePersona.role,
          emoji: activePersona.emoji,
          color: activePersona.color,
          bgColor: activePersona.bgColor,
          borderColor: activePersona.borderColor,
          promptFile: activePersona.promptFile,
          isActive: true,
          promptContent: activePersona.promptContent || promptContent,
        };
      }
      return {
        ...p,
        isActive: false,
        promptContent,
      };
    }),
  };
}

/**
 * Add a persona from the library to active personas
 */
export function addPersonaFromLibrary(personaId: string): PersonasData | null {
  const library = readLibrary();
  const preset = library.presets.find((p) => p.id === personaId);
  if (!preset) return null;

  const data = readPersonas();
  if (data.personas.some((p) => p.id === personaId)) {
    return null; // Already active
  }

  // Read prompt content from library
  const promptPath = resolvePromptPath(preset.promptFile);
  let promptContent = "";
  if (promptPath) {
    try {
      promptContent = fs.readFileSync(promptPath, "utf-8");
    } catch {
      promptContent = "";
    }
  }

  // Add to active personas (reference library file directly)
  const newPersona: PersonaWithPrompt = {
    id: preset.id,
    name: preset.name,
    role: preset.role,
    emoji: preset.emoji,
    color: preset.color,
    bgColor: preset.bgColor,
    borderColor: preset.borderColor,
    promptFile: preset.promptFile, // Keep library/ path
    promptContent,
  };

  data.personas.push(newPersona);
  data.feedbackOrder.push(personaId);
  writePersonas(data);

  return readPersonas();
}

/**
 * Update a library preset's metadata and prompt content
 */
export function updateLibraryPersona(
  personaId: string,
  updates: { name?: string; role?: string; emoji?: string; color?: string; bgColor?: string; borderColor?: string; promptContent?: string }
): LibraryPersonaWithStatus | null {
  const library = readLibrary();
  const idx = library.presets.findIndex((p) => p.id === personaId);
  if (idx === -1) return null;

  const preset = library.presets[idx];
  if (updates.name !== undefined) preset.name = updates.name;
  if (updates.role !== undefined) preset.role = updates.role;
  if (updates.emoji !== undefined) preset.emoji = updates.emoji;
  if (updates.color !== undefined) preset.color = updates.color;
  if (updates.bgColor !== undefined) preset.bgColor = updates.bgColor;
  if (updates.borderColor !== undefined) preset.borderColor = updates.borderColor;

  if (typeof updates.promptContent === "string") {
    const promptPath = resolvePromptPath(preset.promptFile);
    if (promptPath) {
      fs.writeFileSync(promptPath, updates.promptContent, "utf-8");
    }
  }

  fs.writeFileSync(LIBRARY_JSON, JSON.stringify(library, null, 2), "utf-8");

  let promptContent = "";
  const promptPath = resolvePromptPath(preset.promptFile);
  if (promptPath) {
    try { promptContent = fs.readFileSync(promptPath, "utf-8"); } catch { promptContent = ""; }
  }

  const active = readPersonas();
  return {
    ...preset,
    isActive: active.personas.some((p) => p.id === personaId),
    promptContent,
  };
}

/**
 * Remove a persona from active personas
 */
export function removePersona(personaId: string): PersonasData | null {
  const data = readPersonas();
  const index = data.personas.findIndex((p) => p.id === personaId);
  if (index === -1) return null;

  data.personas.splice(index, 1);
  data.feedbackOrder = data.feedbackOrder.filter((id) => id !== personaId);
  writePersonas(data);

  return readPersonas();
}
