import Anthropic from "@anthropic-ai/sdk";
import { getApiKey, readSettings } from "../settings.js";
import type { LLMProvider, LLMOptions, LLMMessage, LLMModelInfo } from "./types.js";

const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

const CLAUDE_MODELS: LLMModelInfo[] = [
  {
    id: "claude-opus-4-5-20251101",
    name: "Claude Opus 4.5",
    description: "Most intelligent model",
    inputPrice: "$15/MTok",
    outputPrice: "$75/MTok",
    latency: "Moderate",
  },
  {
    id: "claude-sonnet-4-5-20250929",
    name: "Claude Sonnet 4.5",
    description: "Speed + intelligence",
    inputPrice: "$3/MTok",
    outputPrice: "$15/MTok",
    latency: "Fast",
  },
  {
    id: "claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5",
    description: "Fastest model",
    inputPrice: "$1/MTok",
    outputPrice: "$5/MTok",
    latency: "Fastest",
  },
];

export class ClaudeProvider implements LLMProvider {
  name = "anthropic";

  private getClient(): Anthropic {
    const apiKey = getApiKey("ANTHROPIC_API_KEY");
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY not configured. Set it in Settings or .env file."
      );
    }
    return new Anthropic({ apiKey });
  }

  getDefaultModel(): string {
    return DEFAULT_MODEL;
  }

  getAvailableModels(): LLMModelInfo[] {
    const settings = readSettings();
    const customModels: LLMModelInfo[] = (settings.CUSTOM_MODELS?.anthropic || []).map(
      (m: { id: string; name: string; description?: string }) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        isCustom: true,
      })
    );
    return [...CLAUDE_MODELS, ...customModels];
  }

  async sendMessage(
    userMessage: string,
    options: LLMOptions = {}
  ): Promise<string> {
    const { system, model = DEFAULT_MODEL, maxTokens = 4096 } = options;

    console.log(
      `[Claude] sendMessage: model=${model}, maxTokens=${maxTokens}, system=${system?.length ?? 0}chars`
    );

    const client = this.getClient();

    const message = await client.messages.create({
      model,
      max_tokens: maxTokens,
      ...(system && { system }),
      messages: [{ role: "user", content: userMessage }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    return textBlock ? textBlock.text : "";
  }

  async sendConversation(
    messages: LLMMessage[],
    options: LLMOptions = {}
  ): Promise<string> {
    const { system, model = DEFAULT_MODEL, maxTokens = 4096 } = options;

    const client = this.getClient();

    const response = await client.messages.create({
      model,
      max_tokens: maxTokens,
      ...(system && { system }),
      messages,
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock ? textBlock.text : "";
  }
}
