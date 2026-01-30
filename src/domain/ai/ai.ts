// FILE: src/domain/ai/ai.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AITaskInput, AITaskOutput } from "@/domain/types";
import { SYSTEM_PROMPT } from "@/domain/prompts/task/rewrite.system";

/* -----------------------------------------
 * CONFIG
 * ----------------------------------------- */

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const modelName =
  import.meta.env.VITE_GEMINI_MODEL || "models/gemini-2.0-flash-001";

const genAI = new GoogleGenerativeAI(apiKey);

/* -----------------------------------------
 * AI LOGGING
 * ----------------------------------------- */

const AI_DEBUG = true;

const aiLog = (...args: any[]) => {
  if (AI_DEBUG) console.log("🤖", ...args);
};

const aiError = (...args: any[]) => {
  console.error("🤖", ...args);
};

/* -----------------------------------------
 * HELPERS
 * ----------------------------------------- */

function extractJsonBlock(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

/* -----------------------------------------
 * MAIN (TASK-BASED AI)
 * ----------------------------------------- */

export async function runAI(
  input: AITaskInput
): Promise<AITaskOutput> {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
${SYSTEM_PROMPT}

---
INPUT (JSON):
${JSON.stringify(input, null, 2)}
`;

    aiLog("TASK PROMPT", prompt);
    aiLog("TASK PROMPT CHARS", prompt.length);

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    aiLog("TASK RAW OUTPUT", raw);

    const jsonBlock = extractJsonBlock(raw);

    if (!jsonBlock) {
      aiError("TASK ERROR: No JSON block found", raw);
      return {
        title: "[AI returned no JSON]",
        content: input.content,
      };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonBlock);
      aiLog("TASK PARSED JSON", parsed);
    } catch (err) {
      aiError("TASK ERROR: JSON parse failed", jsonBlock);
      return {
        title: "[AI returned malformed JSON]",
        content: input.content,
      };
    }

    const finalTitle =
      typeof parsed.title === "string" && parsed.title.trim()
        ? parsed.title.trim()
        : "[AI returned empty title]";

    const finalContent =
      typeof parsed.content === "string"
        ? parsed.content.trim()
        : "";

    aiLog("TASK FINAL OUTPUT", {
      title: finalTitle,
      content: finalContent,
    });

    return {
      title: finalTitle,
      content: finalContent,
    };
  } catch (err) {
    aiError("TASK ERROR: Unhandled AI error", err);
    return {
      title: input.title,
      content: input.content,
    };
  }
}

/* -----------------------------------------
 * GENERIC AI CALL (CHAT / AGENT)
 * ----------------------------------------- */

export async function callAI(params: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<string> {
  const model = genAI.getGenerativeModel({ model: modelName });

  const prompt = `
${params.system}

---
INPUT:
${params.user}
`;

  aiLog("CHAT PROMPT", prompt);
  aiLog("CHAT PROMPT CHARS", prompt.length);

  const result = await model.generateContent(prompt);
  const raw = result.response.text().trim();

  aiLog("CHAT RAW OUTPUT", raw);

  return raw;
}