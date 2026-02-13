import { GoogleGenerativeAI } from "@google/generative-ai";
import { getApiKey, readSettings } from "../settings.js";
import type { LLMProvider, LLMOptions, LLMMessage, LLMModelInfo } from "./types.js";

const DEFAULT_MODEL = "gemini-2.5-flash";

const GEMINI_MODELS: LLMModelInfo[] = [
  {
    id: "gemini-3-pro-preview",
    name: "Gemini 3 Pro (Preview)",
    description: "Most intelligent multimodal model",
    latency: "Moderate",
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash (Preview)",
    description: "Balanced speed and intelligence",
    latency: "Fast",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    description: "Advanced thinking model",
    latency: "Moderate",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    description: "Best price-performance",
    latency: "Fast",
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash-Lite",
    description: "Ultra fast, cost-efficient",
    latency: "Fastest",
  },
];

export class GeminiProvider implements LLMProvider {
  name = "google";

  private getClient(): GoogleGenerativeAI {
    const apiKey = getApiKey("GOOGLE_API_KEY");
    if (!apiKey) {
      throw new Error(
        "GOOGLE_API_KEY not configured. Set it in Settings or .env file."
      );
    }
    return new GoogleGenerativeAI(apiKey);
  }

  getDefaultModel(): string {
    return DEFAULT_MODEL;
  }

  getAvailableModels(): LLMModelInfo[] {
    const settings = readSettings();
    const customModels: LLMModelInfo[] = (settings.CUSTOM_MODELS?.google || []).map(
      (m: { id: string; name: string; description?: string }) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        isCustom: true,
      })
    );
    return [...GEMINI_MODELS, ...customModels];
  }

  async sendMessage(
    userMessage: string,
    options: LLMOptions = {}
  ): Promise<string> {
    const { system, model = DEFAULT_MODEL, maxTokens = 4096 } = options;

    console.log(
      `[Gemini] sendMessage: model=${model}, maxTokens=${maxTokens}, system=${system?.length ?? 0}chars`
    );

    const client = this.getClient();
    const genModel = client.getGenerativeModel({
      model,
      systemInstruction: system,
      generationConfig: { maxOutputTokens: maxTokens },
    });

    const result = await genModel.generateContent(userMessage);
    return result.response.text();
  }

  async sendConversation(
    messages: LLMMessage[],
    options: LLMOptions = {}
  ): Promise<string> {
    const { system, model = DEFAULT_MODEL, maxTokens = 4096 } = options;

    const client = this.getClient();
    const genModel = client.getGenerativeModel({
      model,
      systemInstruction: system,
      generationConfig: { maxOutputTokens: maxTokens },
    });

    // Convert messages to Gemini format (all except last message as history)
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === "user" ? "user" : ("model" as const),
      parts: [{ text: m.content }],
    }));

    const chat = genModel.startChat({ history });
    const lastMessage = messages[messages.length - 1];
    const result = await chat.sendMessage(lastMessage.content);
    return result.response.text();
  }
}
