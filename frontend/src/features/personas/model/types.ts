export interface PersonaInfo {
  id: string;
  name: string;
  role: string;
  emoji: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

/** Full persona row from GET/PUT /personas (includes prompt fields). */
export interface PersonaDraft extends PersonaInfo {
  promptFile: string;
  promptContent: string;
  description?: string;
  source?: "preset" | "custom";
}

export interface PersonasDocument {
  personas: PersonaDraft[];
  feedbackOrder: string[];
  feedbackOrderReason: string;
}
