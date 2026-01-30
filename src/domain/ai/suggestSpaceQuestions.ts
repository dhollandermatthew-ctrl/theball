// FILE: src/domain/ai/suggestSpaceQuestions.ts

import { buildSpaceContext } from "./buildSpaceContext";
import { callAI } from "@/domain/ai/ai";
import { MeetingSpace } from "@/domain/types";

/**
 * Suggests short, high-signal questions based ONLY on the space context.
 * This does NOT answer questions — it only proposes them.
 */
export async function suggestSpaceQuestions(
  space: MeetingSpace
): Promise<string[]> {
  const context = buildSpaceContext(space);

  if (context.meetings.length === 0 && context.notes.length === 0) {
    return [];
  }

  const serializedContext = JSON.stringify(context, null, 2);

  const response = await callAI({
    system: SPACE_QUESTION_SUGGESTION_PROMPT,
    user: `
SPACE CONTEXT:
${serializedContext}

TASK:
Suggest 3–5 short, high-value questions a user could ask about this space.
`.trim(),
  });

  return normalizeQuestions(response);
}

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */

function normalizeQuestions(text: string): string[] {
  return text
    .split("\n")
    .map((q) => q.replace(/^\d+[\).\s-]*/, "").trim())
    .filter(Boolean)
    .slice(0, 5);
}

/* -------------------------------------------------------
   Prompt
------------------------------------------------------- */

const SPACE_QUESTION_SUGGESTION_PROMPT = `
You suggest short, high-signal questions based on a workspace.

Rules:
- You ONLY use the provided space context
- Do NOT answer questions
- Do NOT invent topics
- Questions must be answerable from the context
- Prefer decisions, gaps, repetition, and change over time

STYLE CONSTRAINTS (IMPORTANT):
- Max 6 words per question
- Phrase as short headlines
- No filler phrases
- No punctuation

Good examples:
- What decisions have been made?
- What remains unresolved?
- What changed over time?
- Where do meetings conflict?
- What keeps repeating?

Output:
- A simple list of questions
- No explanations
- No markdown
`.trim();