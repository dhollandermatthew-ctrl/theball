// FILE: src/domain/ai/ollama.ts

// Ollama API client for local AI inference
// Requires Ollama to be running locally: brew install ollama && ollama serve

const OLLAMA_BASE_URL = "http://localhost:11434";

export interface OllamaGenerateParams {
  model: string;
  prompt: string;
  system?: string; // System prompt for context/instructions
  images?: string[]; // Base64 encoded images for vision models
  stream?: boolean;
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
}

class OllamaClient {
  private baseUrl: string;

  constructor(baseUrl: string = OLLAMA_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async generate(params: OllamaGenerateParams): Promise<OllamaResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...params,
          stream: false, // Always use non-streaming for simplicity
        }),
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            `Ollama not found. Make sure Ollama is running (brew install ollama && ollama serve) and the model '${params.model}' is downloaded (ollama pull ${params.model}).`
          );
        }
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error(
          "Cannot connect to Ollama. Make sure Ollama is running locally (ollama serve)."
        );
      }
      throw error;
    }
  }

  async generateWithVision(
    model: string,
    prompt: string,
    imageBase64: string
  ): Promise<OllamaResponse> {
    return this.generate({
      model,
      prompt,
      images: [imageBase64],
    });
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: "GET",
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch {
      return [];
    }
  }
}

export const ollamaClient = new OllamaClient();

// Recommended models:
// - llava: Vision model for images (blood work, workouts)
// - gemma2: Text model for tasks, meetings, general text
// - llama3.2-vision: Alternative vision model

export const OLLAMA_VISION_MODEL = "llava";
export const OLLAMA_TEXT_MODEL = "gemma2";
