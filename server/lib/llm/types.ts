export interface LLMMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  /** System prompt (persona) */
  system?: string;
  /** Model to use */
  model?: string;
  /** Max tokens for response (defaults to 4096) */
  maxTokens?: number;
}

export interface LLMModelInfo {
  id: string;
  name: string;
  description?: string;
  inputPrice?: string;
  outputPrice?: string;
  contextWindow?: string;
  maxOutput?: string;
  latency?: string;
  isCustom?: boolean;
}

export interface LLMProvider {
  name: string;
  sendMessage(userMessage: string, options?: LLMOptions): Promise<string>;
  sendConversation(messages: LLMMessage[], options?: LLMOptions): Promise<string>;
  getDefaultModel(): string;
  getAvailableModels(): LLMModelInfo[];
}

export type ProviderType = "anthropic" | "openai" | "google";
