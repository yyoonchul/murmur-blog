import { GoogleGenerativeAI } from "@google/generative-ai";
import { getApiKey, readSettings } from "../settings.js";
import type { LLMProvider, LLMOptions, LLMMessage, LLMModelInfo } from "./types.js";

const DEFAULT_MODEL = "gemini-3-flash";

const GEMINI_MODELS: LLMModelInfo[] = [
  {
    id: "gemini-3-pro",
    name: "Gemini 3 Pro",
    description: "Most capable reasoning model",
    latency: "Moderate",
  },
  {
    id: "gemini-3-flash",
    name: "Gemini 3 Flash",
    description: "Fast and efficient",
    latency: "Fast",
  },
  {
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "Previous generation",
    latency: "Fast",
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
