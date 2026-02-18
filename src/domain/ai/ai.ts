// FILE: src/domain/ai/ai.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AITaskInput, AITaskOutput } from "@/domain/types";
import { SYSTEM_PROMPT } from "@/domain/prompts/task/rewrite.system";
import { tokenTracker, type TokenUsage } from "@/domain/tokenTracker";
import { modelProvider } from "@/domain/modelProvider";
import { ollamaClient, OLLAMA_TEXT_MODEL } from "./ollama";

/* -----------------------------------------
 * CONFIG
 * ----------------------------------------- */

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const modelName =
  import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash";

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
  const selectedModel = modelProvider.getModel();

  if (selectedModel === "ollama") {
    return runAIWithOllama(input);
  } else {
    return runAIWithGemini(input);
  }
}

async function runAIWithGemini(
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

    const startTime = performance.now();
    const result = await model.generateContent(prompt);
    const latency = performance.now() - startTime;
    
    const raw = result.response.text().trim();

    // Token usage logging
    const usage = result.response.usageMetadata;
    if (usage) {
      const tokenUsage = {
        prompt: usage.promptTokenCount || 0,
        response: usage.candidatesTokenCount || 0,
        total: usage.totalTokenCount || 0,
        type: "TASK",
        category: "analysis" as const,
        promptText: JSON.stringify(input, null, 2),
        systemPrompt: SYSTEM_PROMPT,
        latency: Math.round(latency),
        promptLength: JSON.stringify(input).length,
        responseLength: raw.length
      };
      aiLog("📊 TASK TOKENS:", tokenUsage);
      aiLog("⚡ LATENCY:", `${latency.toFixed(0)}ms`);
      tokenTracker.addUsage(tokenUsage);
    }

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

async function runAIWithOllama(
  input: AITaskInput
): Promise<AITaskOutput> {
  try {
    const prompt = `
${SYSTEM_PROMPT}

---
INPUT (JSON):
${JSON.stringify(input, null, 2)}
`;

    aiLog("OLLAMA TASK PROMPT", prompt);
    aiLog("OLLAMA TASK PROMPT CHARS", prompt.length);

    const startTime = performance.now();
    const result = await ollamaClient.generate({
      model: OLLAMA_TEXT_MODEL,
      prompt,
    });
    const latency = performance.now() - startTime;

    const raw = result.response.trim();

    // Token usage logging (Ollama provides token counts)
    const tokenUsage = {
      prompt: result.prompt_eval_count || 0,
      response: result.eval_count || 0,
      total: (result.prompt_eval_count || 0) + (result.eval_count || 0),
      type: "TASK-OLLAMA",
      category: "analysis" as const,
      promptText: JSON.stringify(input, null, 2),
      systemPrompt: SYSTEM_PROMPT,
      latency: Math.round(latency),
      promptLength: JSON.stringify(input).length,
      responseLength: raw.length,
    };
    aiLog("📊 OLLAMA TASK TOKENS:", tokenUsage);
    aiLog("⚡ OLLAMA LATENCY:", `${latency.toFixed(0)}ms`);
    tokenTracker.addUsage(tokenUsage);

    aiLog("OLLAMA TASK RAW OUTPUT", raw);

    const jsonBlock = extractJsonBlock(raw);

    if (!jsonBlock) {
      aiError("OLLAMA TASK ERROR: No JSON block found", raw);
      return {
        title: "[AI returned no JSON]",
        content: input.content,
      };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonBlock);
    } catch (parseErr) {
      aiError("OLLAMA TASK ERROR: Invalid JSON", jsonBlock, parseErr);
      return {
        title: "[Invalid JSON from AI]",
        content: input.content,
      };
    }

    const finalTitle = parsed.title || input.title || "";
    const finalContent = parsed.content || input.content || "";

    return {
      title: finalTitle,
      content: finalContent,
    };
  } catch (err) {
    aiError("OLLAMA TASK ERROR: Unhandled error", err);
    return {
      title: input.title,
      content: input.content,
    };
  }
}

/* -----------------------------------------
 * GENERIC AI CALL (CHAT / AGENT)
 * -----------------------------------------*/

export async function callAI(params: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<string> {
  const selectedModel = modelProvider.getModel();

  if (selectedModel === "ollama") {
    return callAIWithOllama(params);
  } else {
    return callAIWithGemini(params);
  }
}

async function callAIWithGemini(params: {
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

  const startTime = performance.now();
  const result = await model.generateContent(prompt);
  const latency = performance.now() - startTime;
  
  const raw = result.response.text().trim();

  // Token usage logging
  const usage = result.response.usageMetadata;
  if (usage) {
    const tokenUsage = {
      prompt: usage.promptTokenCount || 0,
      response: usage.candidatesTokenCount || 0,
      total: usage.totalTokenCount || 0,
      type: "CHAT",
      category: "analysis" as const,
      promptText: params.user,
      systemPrompt: params.system,
      latency: Math.round(latency),
      promptLength: params.user.length,
      responseLength: raw.length
    };
    aiLog("📊 CHAT TOKENS:", tokenUsage);
    aiLog("⚡ LATENCY:", `${latency.toFixed(0)}ms`);
    tokenTracker.addUsage(tokenUsage);
  }

  aiLog("CHAT RAW OUTPUT", raw);

  return raw;
}

async function callAIWithOllama(params: {
  system: string;
  user: string;
  imageBase64?: string;
}): Promise<string> {
  const startTime = performance.now();

  aiLog("🤖 OLLAMA CHAT", `User: ${params.user.substring(0, 100)}...`);
  aiLog("SYSTEM PROMPT", params.system);

  try {
    const response = await ollamaClient.generate({
      model: OLLAMA_TEXT_MODEL,
      prompt: params.user,
      system: params.system,
      stream: false,
    });

    const raw = response.response;
    const latency = performance.now() - startTime;

    const tokenUsage: TokenUsage = {
      prompt: response.prompt_eval_count || 0,
      response: response.eval_count || 0,
      total: (response.prompt_eval_count || 0) + (response.eval_count || 0),
      timestamp: Date.now(),
      type: "CHAT-OLLAMA",
      category: "analysis",
      promptText: params.user,
      systemPrompt: params.system,
      latency: Math.round(latency),
      promptLength: params.user.length,
      responseLength: raw.length
    };
    aiLog("📊 CHAT-OLLAMA TOKENS:", tokenUsage);
    aiLog("⚡ LATENCY:", `${latency.toFixed(0)}ms`);
    tokenTracker.addUsage(tokenUsage);

    aiLog("CHAT-OLLAMA RAW OUTPUT", raw);
    return raw;
  } catch (error) {
    aiLog("❌ OLLAMA CHAT ERROR", error);
    throw error;
  }
}
