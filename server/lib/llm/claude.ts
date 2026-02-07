import Anthropic from "@anthropic-ai/sdk";
import { getApiKey, readSettings } from "../settings.js";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

function getClient(): Anthropic {
  const apiKey = getApiKey("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY not configured. Set it in Settings or .env file."
    );
  }
  return new Anthropic({ apiKey });
}

function getModel(): string {
  const settings = readSettings();
  return settings.MODEL || DEFAULT_MODEL;
}

export interface ClaudeOptions {
  /** System prompt (persona) */
  system?: string;
  /** Model to use (defaults to MODEL in settings.json) */
  model?: string;
  /** Max tokens for response (defaults to 4096) */
  maxTokens?: number;
}

/**
 * Send a message to Claude and get a text response.
 *
 * @param userMessage - The user's input text
 * @param options - Optional configuration (system prompt, model, maxTokens)
 * @returns The assistant's text response
 *
 * @example
 * ```ts
 * import { sendMessage } from "./lib/llm/claude.js";
 *
 * const response = await sendMessage("Hello!", {
 *   system: "You are a helpful assistant.",
 * });
 * console.log(response);
 * ```
 */
export async function sendMessage(
  userMessage: string,
  options: ClaudeOptions = {}
): Promise<string> {
  const {
    system,
    model = getModel(),
    maxTokens = 4096,
  } = options;

  const client = getClient();
  const message = await client.messages.create({
    model,
    max_tokens: maxTokens,
    ...(system && { system }),
    messages: [{ role: "user", content: userMessage }],
  });

  // Extract text from the response
  const textBlock = message.content.find((block) => block.type === "text");
  return textBlock ? textBlock.text : "";
}

/**
 * Send a conversation (multiple turns) to Claude and get a text response.
 *
 * @param messages - Array of conversation messages
 * @param options - Optional configuration (system prompt, model, maxTokens)
 * @returns The assistant's text response
 *
 * @example
 * ```ts
 * import { sendConversation } from "./lib/llm/claude.js";
 *
 * const response = await sendConversation([
 *   { role: "user", content: "Hello!" },
 *   { role: "assistant", content: "Hi there!" },
 *   { role: "user", content: "How are you?" },
 * ], {
 *   system: "You are a friendly assistant.",
 * });
 * ```
 */
export async function sendConversation(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  options: ClaudeOptions = {}
): Promise<string> {
  const {
    system,
    model = getModel(),
    maxTokens = 4096,
  } = options;

  const client = getClient();
  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    ...(system && { system }),
    messages,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  return textBlock ? textBlock.text : "";
}
