// FILE: src/domain/ai/ai.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYSTEM_PROMPT } from "@/domain/systemPrompt";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const modelName = import.meta.env.VITE_GEMINI_MODEL || "models/gemini-2.0-flash-001";

console.log("🔎 Using API Key:", apiKey);
console.log("🔎 Using model:", modelName);

const genAI = new GoogleGenerativeAI(apiKey);

export async function runAI(userText: string) {
  console.log("🔵 Gemini request:", { model: modelName, prompt: userText });

  try {
    const model = genAI.getGenerativeModel({ model: modelName });

    // Browser SDK requires a single string or parts[].
    // We inject SYSTEM_PROMPT manually above the user note.
    const prompt = `
${SYSTEM_PROMPT}

---
User note:
${userText}

---
Rewrite this as a clear, concise task in 1–3 sentences.
`;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();

    console.log("🟢 Gemini response:", text);
    return text.trim();
  } catch (err) {
    console.error("❌ Gemini error:", err);
    return userText;
  }
}