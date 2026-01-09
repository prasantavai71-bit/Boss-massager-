
import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  private async executeWithRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        if (error?.status === 429 || error?.status >= 500) {
          const waitTime = Math.pow(2, i) * 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  }

  async translateText(text: string, targetLanguage: string): Promise<string> {
    try {
      return await this.executeWithRetry(async () => {
        const response = await this.ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Translate to ${targetLanguage}. ONLY text: "${text}"`,
          config: { temperature: 0.1 }
        });
        return response.text?.trim() || "Translation failed.";
      });
    } catch (error) {
      return "Translation Error.";
    }
  }

  async *getResponseStream(message: string, contactName: string) {
    try {
      const result = await this.ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: { parts: [{ text: message || "Hello Boss!" }] },
        config: {
          systemInstruction: `You are simulating a WhatsApp contact named ${contactName} in an app called Boss Massager. 
          Respond professionally but warmly like a loyal business associate or friend. 
          Use Bengali or English as per user input. Concise responses. Use emojis like 🤝, 🚀, 👑.`,
          temperature: 0.7,
        }
      });

      for await (const chunk of result) {
        if (chunk.text) yield chunk.text;
      }
    } catch (error: any) {
      yield "Boss, it seems like there is a network glitch. Let me check and get back to you! 🤝";
    }
  }
}

export const geminiService = new GeminiService();
