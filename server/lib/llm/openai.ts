import OpenAI from "openai";
import { getApiKey, readSettings } from "../settings.js";
import type { LLMProvider, LLMOptions, LLMMessage, LLMModelInfo } from "./types.js";

const DEFAULT_MODEL = "gpt-5-mini";

const OPENAI_MODELS: LLMModelInfo[] = [
  {
    id: "gpt-5.2",
    name: "GPT-5.2",
    description: "Best for coding and agentic tasks",
    latency: "Moderate",
  },
  {
    id: "gpt-5.2-pro",
    name: "GPT-5.2 Pro",
    description: "Smarter and more precise responses",
    latency: "Slow",
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    description: "Fast, cost-efficient for well-defined tasks",
    latency: "Fast",
  },
  {
    id: "gpt-5-nano",
    name: "GPT-5 Nano",
    description: "Fastest, most cost-efficient",
    latency: "Fastest",
  },
];

export class OpenAIProvider implements LLMProvider {
  name = "openai";

  private getClient(): OpenAI {
    const apiKey = getApiKey("OPENAI_API_KEY");
    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY not configured. Set it in Settings or .env file."
      );
    }
    return new OpenAI({ apiKey });
  }

  getDefaultModel(): string {
    return DEFAULT_MODEL;
  }

  getAvailableModels(): LLMModelInfo[] {
    const settings = readSettings();
    const customModels: LLMModelInfo[] = (settings.CUSTOM_MODELS?.openai || []).map(
      (m: { id: string; name: string; description?: string }) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        isCustom: true,
      })
    );
    return [...OPENAI_MODELS, ...customModels];
  }

  async sendMessage(
    userMessage: string,
    options: LLMOptions = {}
  ): Promise<string> {
    const { system, model = DEFAULT_MODEL, maxTokens = 4096 } = options;

    console.log(
      `[OpenAI] sendMessage: model=${model}, maxTokens=${maxTokens}, system=${system?.length ?? 0}chars`
    );

    const client = this.getClient();

    const messages: OpenAI.ChatCompletionMessageParam[] = [];
    if (system) {
      messages.push({ role: "system", content: system });
    }
    messages.push({ role: "user", content: userMessage });

    const response = await client.chat.completions.create({
      model,
      max_completion_tokens: maxTokens,
      messages,
    });

    return response.choices[0]?.message?.content || "";
  }

  async sendConversation(
    messages: LLMMessage[],
    options: LLMOptions = {}
  ): Promise<string> {
    const { system, model = DEFAULT_MODEL, maxTokens = 4096 } = options;

    const client = this.getClient();

    const apiMessages: OpenAI.ChatCompletionMessageParam[] = [];
    if (system) {
      apiMessages.push({ role: "system", content: system });
    }
    for (const msg of messages) {
      apiMessages.push({ role: msg.role, content: msg.content });
    }

    const response = await client.chat.completions.create({
      model,
      max_completion_tokens: maxTokens,
      messages: apiMessages,
    });

    return response.choices[0]?.message?.content || "";
  }
}
