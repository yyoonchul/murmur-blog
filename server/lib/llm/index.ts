import { readSettings } from "../settings.js";
import { ClaudeProvider } from "./claude.js";
import { OpenAIProvider } from "./openai.js";
import { GeminiProvider } from "./gemini.js";
import type { LLMProvider, LLMOptions, LLMMessage, ProviderType, LLMModelInfo } from "./types.js";

export type { LLMOptions, LLMMessage, LLMProvider, LLMModelInfo, ProviderType } from "./types.js";

const providers: Record<ProviderType, LLMProvider> = {
  anthropic: new ClaudeProvider(),
  openai: new OpenAIProvider(),
  google: new GeminiProvider(),
};

/**
 * Get the LLM provider instance.
 * If no providerType specified, reads from settings.PROVIDER (defaults to "anthropic").
 */
export function getProvider(providerType?: ProviderType): LLMProvider {
  const settings = readSettings();
  const type = providerType || settings.PROVIDER || "anthropic";
  return providers[type as ProviderType] || providers.anthropic;
}

/**
 * Get all available providers.
 */
export function getAllProviders(): Record<ProviderType, LLMProvider> {
  return providers;
}

/**
 * Get available provider types.
 */
export function getProviderTypes(): ProviderType[] {
  return Object.keys(providers) as ProviderType[];
}

// Backward-compatible exports (used by comments.ts)
export async function sendMessage(
  userMessage: string,
  options: LLMOptions = {}
): Promise<string> {
  const provider = getProvider();
  const settings = readSettings();
  return provider.sendMessage(userMessage, {
    ...options,
    model: options.model || settings.MODEL,
  });
}

export async function sendConversation(
  messages: LLMMessage[],
  options: LLMOptions = {}
): Promise<string> {
  const provider = getProvider();
  const settings = readSettings();
  return provider.sendConversation(messages, {
    ...options,
    model: options.model || settings.MODEL,
  });
}

// For backward compatibility
export type ClaudeOptions = LLMOptions;
