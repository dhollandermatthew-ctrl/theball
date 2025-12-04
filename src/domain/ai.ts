// FILE: src/domain/ai.ts
// -------------------------------------------------------------
// Gemini (using @google/generative-ai@0.10.0) + Whisper
// -------------------------------------------------------------

import { GoogleGenerativeAI } from "@google/generative-ai";

// -------------------------------------------------------------
// Gemini Setup (v1beta API — the ONLY version supported in 0.10.0)
// -------------------------------------------------------------
const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
const geminiModel =
  import.meta.env.VITE_GEMINI_MODEL || "gemini-1.5-flash";

if (!geminiApiKey) {
  console.error("❌ Missing VITE_GEMINI_API_KEY");
}

// Create the client
const genAI = new GoogleGenerativeAI(geminiApiKey);

// -------------------------------------------------------------
// Gemini — Run AI Text Generation
// -------------------------------------------------------------
export async function runAI(prompt: string): Promise<string> {
  try {
    console.log("🔵 Gemini request:", { model: geminiModel, prompt });

    const model = genAI.getGenerativeModel({
      model: geminiModel,
    });

    // v1beta format — ONLY this works in 0.10.0
    const result = await model.generateContent(prompt);

    const text = result.response.text();
    console.log("🟢 Gemini response:", text);

    return text ?? "";
  } catch (err) {
    console.error("❌ AI ERROR:", err);
    throw err;
  }
}

// -------------------------------------------------------------
// Whisper — OpenAI Audio Transcription (unchanged)
// -------------------------------------------------------------
export async function transcribeAudioWithWhisper(
  blob: Blob
): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (!apiKey) {
    console.error("❌ Missing VITE_OPENAI_API_KEY");
    throw new Error("No OpenAI API key configured");
  }

  const formData = new FormData();
  formData.append("file", blob, "recording.webm");
  formData.append("model", "whisper-1");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("❌ Whisper API error:", res.status, text);
    throw new Error("Whisper API error");
  }

  const data = await res.json();
  console.log("[Whisper] transcription result:", data);

  return data.text as string;
}