// FILE: src/domain/ai/taskExtraction.ts

import { addDays, nextDay, parse } from "date-fns";
import { EXTRACT_SYSTEM_PROMPT } from "@/domain/prompts/task/extract.system";
import { tokenTracker } from "@/domain/tokenTracker";
import { TaskPriority, TaskCategory } from "@/domain/types";

/* -----------------------------------------
 * CONFIG
 * ----------------------------------------- */

const groqApiKey = import.meta.env.VITE_GROQ_API_KEY;
const groqModel = "llama-3.3-70b-versatile"; // Fast, accurate, generous limits

/* -----------------------------------------
 * TYPES
 * ----------------------------------------- */

export interface ExtractedTask {
  title: string;
  description: string;
  priority: TaskPriority;
  date: string; // ISO date string (YYYY-MM-DD)
  category: TaskCategory;
}

interface AIExtractedTask {
  title: string;
  description: string;
  priority: TaskPriority;
  date: string; // AI format: TODAY, TOMORROW, NEXT_FRIDAY, DATE_2026-03-30
  category: TaskCategory;
}

/* -----------------------------------------
 * HELPERS
 * ----------------------------------------- */

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateToken(token: string): string {
  const today = new Date();
  
  if (token === "TODAY") {
    return toLocalDateString(today);
  }
  
  if (token === "TOMORROW") {
    return toLocalDateString(addDays(today, 1));
  }
  
  // NEXT_FRIDAY, NEXT_MONDAY, etc.
  if (token.startsWith("NEXT_")) {
    const dayName = token.replace("NEXT_", "");
    const dayMap: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | 6> = {
      SUNDAY: 0,
      MONDAY: 1,
      TUESDAY: 2,
      WEDNESDAY: 3,
      THURSDAY: 4,
      FRIDAY: 5,
      SATURDAY: 6,
    };
    
    const dayIndex = dayMap[dayName];
    if (dayIndex !== undefined) {
      return toLocalDateString(nextDay(today, dayIndex));
    }
  }
  
  // DATE_2026-03-30
  if (token.startsWith("DATE_")) {
    const dateStr = token.replace("DATE_", "");
    // Parse date string directly without timezone conversion
    // Format: YYYY-MM-DD
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      return dateStr; // Already in YYYY-MM-DD format, return as-is
    }
  }
  
  // Default: today
  return toLocalDateString(today);
}

function extractJsonBlock(text: string): string | null {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

/* -----------------------------------------
 * MAIN FUNCTION
 * ----------------------------------------- */

export async function extractTaskFromNaturalLanguage(
  input: string
): Promise<ExtractedTask> {
  try {
    if (!groqApiKey) {
      throw new Error('Groq API key not configured');
    }

    console.log('========================================');
    console.log('[TaskExtraction] START');
    console.log('[TaskExtraction] Model:', groqModel);
    console.log('[TaskExtraction] Provider: Groq');
    console.log('[TaskExtraction] Input:', input);
    console.log('[TaskExtraction] System prompt length:', EXTRACT_SYSTEM_PROMPT.length);
    console.log('========================================');
    
    const startTime = performance.now();
    
    // Call Groq API (OpenAI-compatible)
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: groqModel,
        messages: [
          { role: 'system', content: EXTRACT_SYSTEM_PROMPT },
          { role: 'user', content: input }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
    });

    const latency = performance.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[TaskExtraction] Groq API error:', response.status, errorText);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const raw = data.choices[0]?.message?.content || '{}';
    
    console.log('[TaskExtraction] Raw Groq output:', raw);
    console.log('[TaskExtraction] Latency:', `${latency.toFixed(0)}ms`);

    // Token usage logging (Groq format)
    const usage = data.usage;
    if (usage) {
      const tokenUsage = {
        prompt: usage.prompt_tokens || 0,
        response: usage.completion_tokens || 0,
        total: usage.total_tokens || 0,
        type: "TASK_EXTRACTION",
        category: "analysis" as const,
        promptText: input,
        systemPrompt: EXTRACT_SYSTEM_PROMPT,
        latency: Math.round(latency),
        promptLength: input.length,
        responseLength: raw.length,
      };
      console.log('[TaskExtraction] Tokens:', tokenUsage);
      tokenTracker.addUsage(tokenUsage);
    }

    const jsonBlock = extractJsonBlock(raw);
    if (!jsonBlock) {
      console.error('[TaskExtraction] No JSON found in output');
      throw new Error("AI did not return valid JSON");
    }

    let parsed: AIExtractedTask;
    try {
      parsed = JSON.parse(jsonBlock);
      console.log('[TaskExtraction] ✓ Parsed JSON successfully');
      console.log('[TaskExtraction] Parsed object:', JSON.stringify(parsed, null, 2));
      console.log('[TaskExtraction] Priority from AI:', parsed.priority);
      console.log('[TaskExtraction] Date from AI:', parsed.date);
    } catch (err) {
      console.error('[TaskExtraction] JSON parse failed:', err);
      throw new Error("AI returned malformed JSON");
    }

    // Validate and transform
    const title = parsed.title?.trim() || "Untitled Task";
    const description = parsed.description?.trim() || "";
    const priority: TaskPriority = ["p1", "p2", "p3"].includes(parsed.priority)
      ? parsed.priority
      : "p2";
    const category: TaskCategory = ["work", "personal"].includes(parsed.category)
      ? parsed.category
      : "work";
    const date = parseDateToken(parsed.date || "TODAY");

    const extractedResult = {
      title,
      description,
      priority,
      date,
      category,
    };

    console.log('[TaskExtraction] ========================================');
    console.log('[TaskExtraction] FINAL RESULT:');
    console.log('[TaskExtraction] Title:', title);
    console.log('[TaskExtraction] Priority:', priority, '(from AI:', parsed.priority + ')');
    console.log('[TaskExtraction] Date:', date, '(from AI:', parsed.date + ')');
    console.log('[TaskExtraction] Category:', category);
    console.log('[TaskExtraction] ========================================');
    return extractedResult;

  } catch (err) {
    console.error('[TaskExtraction] Error:', err);
    
    // Fallback: create simple task from input
    return {
      title: input.slice(0, 60) || "Untitled Task",
      description: input,
      priority: "p2",
      date: new Date().toISOString().slice(0, 10),
      category: "work",
    };
  }
}
