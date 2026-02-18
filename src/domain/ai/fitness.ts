// FILE: src/domain/ai/fitness.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import { WorkoutRecord } from "@/domain/types";
import { generateId } from "@/domain/utils";
import { tokenTracker } from "@/domain/tokenTracker";
import { modelProvider } from "@/domain/modelProvider";
import { ollamaClient, OLLAMA_VISION_MODEL } from "@/domain/ai/ollama";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const modelName = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash";

if (!apiKey) {
  console.warn("⚠️ VITE_GEMINI_API_KEY not configured. Vision features will not work with Gemini.");
}

const genAI = new GoogleGenerativeAI(apiKey || 'dummy-key');

const EXTRACTION_PROMPT = `You are a fitness data extraction assistant. Analyze the provided workout image (Strava screenshot, treadmill display, fitness app, etc.) and extract all workout metrics.

Extract the following information:
1. Workout type (run, treadmill, bike, walk, other)
2. Distance (in km - if shown in miles, convert to km)
3. Duration/time (in minutes - convert from HH:MM:SS or MM:SS format)
4. Pace (e.g., "6:02 min/km" - keep original format if visible)
5. Calories burned
6. Workout date (if visible)

Return ONLY a JSON object with this exact structure (no markdown, no code blocks):
{
  "type": "run",
  "distance": 5.0,
  "duration": 30.18,
  "pace": "6:02 min/km",
  "calories": 375,
  "date": "2025-03-11"
}

Important rules:
- Use null for any field that is not visible or cannot be determined
- Convert miles to kilometers (1 mile = 1.60934 km)
- Convert time to decimal minutes (e.g., 30:11 = 30.18 minutes)
- If pace is in min/mile, note it but keep the format
- Return ONLY the JSON object, no explanation or markdown

If you cannot extract meaningful workout data from the image, return:
{
  "type": "other",
  "distance": null,
  "duration": null,
  "pace": null,
  "calories": null,
  "date": null
}`;

export async function extractWorkoutFromImage(
  file: File
): Promise<WorkoutRecord> {
  const currentModel = modelProvider.getModel();
  
  if (currentModel === "ollama") {
    return extractWorkoutFromImageWithOllama(file);
  }
  
  return extractWorkoutFromImageWithGemini(file);
}

async function extractWorkoutFromImageWithGemini(
  file: File
): Promise<WorkoutRecord> {
  // Check API key first
  if (!apiKey) {
    throw new Error("Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your .env file, or switch to Ollama in the header.");
  }
  
  try {
    console.log("🏃 Extracting workout from:", file.name, "(Gemini)");

    // Convert file to base64
    const base64Data = await fileToBase64(file);
    const mimeType = file.type || "image/jpeg";

    const model = genAI.getGenerativeModel({ model: modelName });

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType,
      },
    };

    const startTime = performance.now();
    const result = await model.generateContent([EXTRACTION_PROMPT, imagePart]);
    const latency = performance.now() - startTime;

    const raw = result.response.text().trim();
    console.log("🤖 RAW EXTRACTION:", raw);

    // Log token usage
    const usage = result.response.usageMetadata;
    if (usage) {
      tokenTracker.addUsage({
        prompt: usage.promptTokenCount || 0,
        response: usage.candidatesTokenCount || 0,
        total: usage.totalTokenCount || 0,
        type: "FITNESS",
        category: "vision",
        promptText: `[Image: ${file.name}]`,
        systemPrompt: EXTRACTION_PROMPT,
        latency: Math.round(latency),
        promptLength: EXTRACTION_PROMPT.length,
        responseLength: raw.length,
      });
    }

    // Parse JSON response
    const extracted = parseWorkoutResponse(raw);

    const record: WorkoutRecord = {
      id: generateId(),
      date: extracted.date || new Date().toISOString().slice(0, 10),
      type: extracted.type || "other",
      distance: extracted.distance || undefined,
      duration: extracted.duration || undefined,
      pace: extracted.pace || undefined,
      calories: extracted.calories || undefined,
      sourceType: "image",
      sourceFileName: file.name,
      createdAt: new Date().toISOString(),
    };

    console.log("✅ Workout record created:", record);
    return record;
  } catch (error) {
    console.error("❌ Workout extraction error:", error);
    
    // Provide more helpful error messages
    if (error instanceof Error) {
      // Check for actual rate limit errors (HTTP 429) - be more specific
      const errorStr = error.message.toLowerCase();
      const stackStr = error.stack?.toLowerCase() || '';
      
      // Only treat as quota error if it's clearly a rate limit (429) or resource exhausted
      if (
        errorStr.includes('429') || 
        errorStr.includes('resource_exhausted') ||
        (errorStr.includes('quota') && errorStr.includes('exceeded'))
      ) {
        throw new Error("API quota exceeded. Try again later or enter data manually.");
      }
      
      // Log the full error for debugging
      console.error("Full error details:", {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      
      throw error;
    }
    
    throw new Error("Failed to extract workout data from image");
  }
}

async function extractWorkoutFromImageWithOllama(
  file: File
): Promise<WorkoutRecord> {
  try {
    console.log("🏃 Extracting workout from:", file.name, "(Ollama)");

    // Convert file to base64
    const base64Data = await fileToBase64(file);

    const startTime = performance.now();
    const result = await ollamaClient.generateWithVision(
      OLLAMA_VISION_MODEL,
      EXTRACTION_PROMPT,
      base64Data
    );
    const latency = performance.now() - startTime;
    const raw = result.response;

    console.log("🤖 RAW EXTRACTION (Ollama):", raw);

    // Log token usage (Ollama doesn't provide detailed token counts for vision)
    tokenTracker.addUsage({
      prompt: Math.round(EXTRACTION_PROMPT.length / 4), // Estimate
      response: Math.round(raw.length / 4), // Estimate
      total: Math.round((EXTRACTION_PROMPT.length + raw.length) / 4),
      type: "FITNESS-OLLAMA",
      category: "vision",
      promptText: `[Image: ${file.name}]`,
      systemPrompt: EXTRACTION_PROMPT,
      latency: Math.round(latency),
      promptLength: EXTRACTION_PROMPT.length,
      responseLength: raw.length,
    });

    // Parse JSON response
    const extracted = parseWorkoutResponse(raw);

    const record: WorkoutRecord = {
      id: generateId(),
      date: extracted.date || new Date().toISOString().slice(0, 10),
      type: extracted.type || "other",
      distance: extracted.distance || undefined,
      duration: extracted.duration || undefined,
      pace: extracted.pace || undefined,
      calories: extracted.calories || undefined,
      sourceType: "image",
      sourceFileName: file.name,
      createdAt: new Date().toISOString(),
    };

    console.log("✅ Workout record created:", record);
    return record;
  } catch (error) {
    console.error("❌ Workout extraction error (Ollama):", error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error("Failed to extract workout data from image using Ollama");
  }
}

function parseWorkoutResponse(raw: string): {
  type: "run" | "treadmill" | "bike" | "walk" | "other";
  distance: number | null;
  duration: number | null;
  pace: string | null;
  calories: number | null;
  date: string | null;
} {
  try {
    // Remove markdown code blocks if present
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    }

    const parsed = JSON.parse(cleaned);

    return {
      type: parsed.type || "other",
      distance: parsed.distance ? Number(parsed.distance) : null,
      duration: parsed.duration ? Number(parsed.duration) : null,
      pace: parsed.pace || null,
      calories: parsed.calories ? Number(parsed.calories) : null,
      date: parsed.date || null,
    };
  } catch (error) {
    console.error("JSON parse error:", error, "Raw:", raw);
    throw new Error("Failed to parse AI response as JSON");
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
