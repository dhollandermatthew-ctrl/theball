// FILE: src/domain/ai/ai.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import { SYSTEM_PROMPT } from "@/domain/systemPrompt";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const modelName =
  import.meta.env.VITE_GEMINI_MODEL || "models/gemini-2.0-flash-001";

console.log("🔎 Using API Key:", apiKey);
console.log("🔎 Using model:", modelName);

const genAI = new GoogleGenerativeAI(apiKey);

export async function runAI(userText: string) {
  console.log("🔵 Gemini request:", { model: modelName, prompt: userText });

  try {
    const model = genAI.getGenerativeModel({ model: modelName });

    // CLEAN VERSION — only system prompt + user note
    const prompt = `
${SYSTEM_PROMPT}

---
User note:
${userText}
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