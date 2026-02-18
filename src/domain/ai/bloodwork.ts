// FILE: src/domain/ai/bloodwork.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import { LabValue, BloodWorkRecord } from "@/domain/types";
import { generateId } from "@/domain/utils";
import { tokenTracker } from "@/domain/tokenTracker";
import { modelProvider } from "@/domain/modelProvider";
import { ollamaClient, OLLAMA_VISION_MODEL, OLLAMA_TEXT_MODEL } from "@/domain/ai/ollama";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const modelName = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash";

if (!apiKey) {
  console.warn("⚠️ VITE_GEMINI_API_KEY not configured. Vision features will not work with Gemini.");
}

const genAI = new GoogleGenerativeAI(apiKey || 'dummy-key');

const EXTRACTION_PROMPT = `You are a medical data extraction assistant. Analyze the provided blood work/lab report image or PDF and extract all lab values in a structured JSON format.

Extract the following information:
1. Lab test name
2. Test value (numeric)
3. Unit of measurement
4. Reference range (if shown)  
5. Flag indicator (H for High, L for Low, HH for Very High, LL for Very Low, CRIT for Critical - if shown)
6. Lab name (e.g., LifeLabs, Quest Diagnostics)
7. Test date

Return ONLY a JSON object with this exact structure (no markdown, no code blocks):
{
  "labName": "LifeLabs",
  "testDate": "2024-12-15",
  "labValues": [
    {
      "name": "Cholesterol, Total",
      "value": "8.61",
      "unit": "mmol/L",
      "referenceRange": "<5.20",
      "flag": "H"
    },
    {
      "name": "LDL Cholesterol",
      "value": "5.57",
      "unit": "mmol/L",
      "referenceRange": "<3.40",
      "flag": "H"
    }
  ]
}

Important rules:
- Extract ALL lab values visible in the document
- Include reference ranges when visible
- Use flags (H, L, HH, LL, CRIT) when indicated
- If a value is within normal range, omit the "flag" field
- Return ONLY the JSON object, no explanation or markdown
- If lab name or test date are not visible, use null
`;

export async function extractBloodWorkFromFile(
  file: File
): Promise<BloodWorkRecord> {
  const currentModel = modelProvider.getModel();
  
  if (currentModel === "ollama") {
    return extractBloodWorkFromFileWithOllama(file);
  }
  
  return extractBloodWorkFromFileWithGemini(file);
}

async function extractBloodWorkFromFileWithGemini(
  file: File
): Promise<BloodWorkRecord> {
  // Check API key first
  if (!apiKey) {
    throw new Error("Gemini API key not configured. Please set VITE_GEMINI_API_KEY in your .env file, or switch to Ollama in the header.");
  }
  
  try {
    console.log("🩸 Extracting blood work from:", file.name, "(Gemini)");

    // Convert file to base64
    const base64Data = await fileToBase64(file);
    const mimeType = file.type || "application/pdf";

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
        type: "VISION",
        category: "vision",
        promptText: `[Image: ${file.name}]`,
        systemPrompt: EXTRACTION_PROMPT,
        latency: Math.round(latency),
        promptLength: EXTRACTION_PROMPT.length,
        responseLength: raw.length,
      });
    }

    // Parse JSON response
    const extracted = parseExtractionResponse(raw);

    // Generate AI analysis
    const analysis = await generateBloodWorkAnalysis(extracted.labValues);

    const record: BloodWorkRecord = {
      id: generateId(),
      date: extracted.testDate || new Date().toISOString().slice(0, 10),
      labName: extracted.labName || undefined,
      sourceType: file.type.includes("pdf") ? "pdf" : "image",
      sourceFileName: file.name,
      labValues: extracted.labValues,
      aiAnalysis: analysis.summary,
      aiFlags: analysis.flags,
      createdAt: new Date().toISOString(),
    };

    console.log("✅ Blood work record created:", record);
    return record;
  } catch (error) {
    console.error("❌ Blood work extraction error:", error);
    
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
    
    throw new Error("Failed to extract blood work data from file");
  }
}

async function extractBloodWorkFromFileWithOllama(
  file: File
): Promise<BloodWorkRecord> {
  try {
    console.log("🩸 Extracting blood work from:", file.name, "(Ollama)");

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
      type: "VISION-OLLAMA",
      category: "vision",
      promptText: `[Image: ${file.name}]`,
      systemPrompt: EXTRACTION_PROMPT,
      latency: Math.round(latency),
      promptLength: EXTRACTION_PROMPT.length,
      responseLength: raw.length,
    });

    // Parse JSON response
    const extracted = parseExtractionResponse(raw);

    // Generate AI analysis
    const analysis = await generateBloodWorkAnalysis(extracted.labValues);

    const record: BloodWorkRecord = {
      id: generateId(),
      date: extracted.testDate || new Date().toISOString().slice(0, 10),
      labName: extracted.labName || undefined,
      sourceType: file.type.includes("pdf") ? "pdf" : "image",
      sourceFileName: file.name,
      labValues: extracted.labValues,
      aiAnalysis: analysis.summary,
      aiFlags: analysis.flags,
      createdAt: new Date().toISOString(),
    };

    console.log("✅ Blood work record created:", record);
    return record;
  } catch (error) {
    console.error("❌ Blood work extraction error (Ollama):", error);
    
    if (error instanceof Error) {
      throw error;
    }
    
    throw new Error("Failed to extract blood work data from file using Ollama");
  }
}

function parseExtractionResponse(raw: string): {
  labName: string | null;
  testDate: string | null;
  labValues: LabValue[];
} {
  try {
    // Remove markdown code blocks if present
    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    }

    const parsed = JSON.parse(cleaned);

    return {
      labName: parsed.labName || null,
      testDate: parsed.testDate || null,
      labValues: Array.isArray(parsed.labValues) ? parsed.labValues : [],
    };
  } catch (error) {
    console.error("JSON parse error:", error, "Raw:", raw);
    throw new Error("Failed to parse AI response as JSON");
  }
}

async function generateBloodWorkAnalysis(labValues: LabValue[]): Promise<{
  summary: string;
  flags: string[];
}> {
  if (labValues.length === 0) {
    return {
      summary: "No lab values extracted from the document.",
      flags: [],
    };
  }

  const currentModel = modelProvider.getModel();
  
  if (currentModel === "ollama") {
    return generateBloodWorkAnalysisWithOllama(labValues);
  }
  
  return generateBloodWorkAnalysisWithGemini(labValues);
}

async function generateBloodWorkAnalysisWithGemini(labValues: LabValue[]): Promise<{
  summary: string;
  flags: string[];
}> {
  const model = genAI.getGenerativeModel({ model: modelName });

  const analysisPrompt = `You are a health data analyst. Review these blood work results and provide:
1. A brief 2-3 sentence summary of the overall health picture
2. A list of specific concerns or areas needing attention

Lab Results:
${JSON.stringify(labValues, null, 2)}

Return ONLY a JSON object:
{
  "summary": "Your 2-3 sentence summary here",
  "flags": ["Specific concern 1", "Specific concern 2"]
}`;

  try {
    const startTime = performance.now();
    const result = await model.generateContent(analysisPrompt);
    const latency = performance.now() - startTime;

    const raw = result.response.text().trim();

    // Log token usage
    const usage = result.response.usageMetadata;
    if (usage) {
      tokenTracker.addUsage({
        prompt: usage.promptTokenCount || 0,
        response: usage.candidatesTokenCount || 0,
        total: usage.totalTokenCount || 0,
        type: "ANALYSIS",
        category: "analysis",
        promptText: JSON.stringify(labValues),
        systemPrompt: analysisPrompt,
        latency: Math.round(latency),
        promptLength: analysisPrompt.length,
        responseLength: raw.length,
      });
    }

    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    }

    const parsed = JSON.parse(cleaned);

    return {
      summary: parsed.summary || "Analysis completed.",
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
    };
  } catch (error) {
    console.error("Analysis generation error:", error);
    return {
      summary: "Unable to generate detailed analysis.",
      flags: [],
    };
  }
}

async function generateBloodWorkAnalysisWithOllama(labValues: LabValue[]): Promise<{
  summary: string;
  flags: string[];
}> {
  const analysisPrompt = `You are a health data analyst. Review these blood work results and provide:
1. A brief 2-3 sentence summary of the overall health picture
2. A list of specific concerns or areas needing attention

Lab Results:
${JSON.stringify(labValues, null, 2)}

Return ONLY a JSON object:
{
  "summary": "Your 2-3 sentence summary here",
  "flags": ["Specific concern 1", "Specific concern 2"]
}`;

  try {
    const startTime = performance.now();
    const response = await ollamaClient.generate({
      model: OLLAMA_TEXT_MODEL,
      prompt: analysisPrompt,
      stream: false,
    });
    const latency = performance.now() - startTime;

    const raw = response.response.trim();

    // Log token usage
    tokenTracker.addUsage({
      prompt: response.prompt_eval_count || 0,
      response: response.eval_count || 0,
      total: (response.prompt_eval_count || 0) + (response.eval_count || 0),
      type: "ANALYSIS-OLLAMA",
      category: "analysis",
      promptText: JSON.stringify(labValues),
      systemPrompt: analysisPrompt,
      latency: Math.round(latency),
      promptLength: analysisPrompt.length,
      responseLength: raw.length,
    });

    let cleaned = raw.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    }

    const parsed = JSON.parse(cleaned);

    return {
      summary: parsed.summary || "Analysis completed.",
      flags: Array.isArray(parsed.flags) ? parsed.flags : [],
    };
  } catch (error) {
    console.error("Analysis generation error (Ollama):", error);
    return {
      summary: "Unable to generate detailed analysis.",
      flags: [],
    };
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
