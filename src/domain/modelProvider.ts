// FILE: src/domain/modelProvider.ts

export type AIModel = "gemini" | "ollama";

const STORAGE_KEY = "ai_model_preference";

class ModelProvider {
  private currentModel: AIModel = "gemini";
  private listeners: Set<(model: AIModel) => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "gemini" || stored === "ollama") {
        this.currentModel = stored;
      }
    } catch (e) {
      console.error("Failed to load model preference:", e);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, this.currentModel);
    } catch (e) {
      console.error("Failed to save model preference:", e);
    }
  }

  getModel(): AIModel {
    return this.currentModel;
  }

  setModel(model: AIModel) {
    this.currentModel = model;
    this.saveToStorage();
    this.notifyListeners();
  }

  subscribe(listener: (model: AIModel) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.currentModel));
  }
}

export const modelProvider = new ModelProvider();
