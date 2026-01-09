import { callAI } from "@/domain/ai/ai";
import { SUMMARIZE_MEETING_SYSTEM_PROMPT } from "@/domain/prompts/meetings/summarize.system";
import { SPACE_QA_SYSTEM_PROMPT } from "@/domain/prompts/meetings/spaceQa.system";
import type { MeetingSpace, MeetingInsight } from "@/domain/types";

/* -----------------------------------------
 * TYPES
 * ----------------------------------------- */

interface ProcessMeetingInput {
  transcript: string;
}

/* -----------------------------------------
 * MEETING AI — SUMMARIZATION
 * ----------------------------------------- */

export async function processMeetingTranscript(
  input: ProcessMeetingInput
): Promise<MeetingInsight> {
  const transcript = input.transcript?.trim();

  if (!transcript) {
    throw new Error("processMeetingTranscript: transcript is empty");
  }

  const raw = await callAI({
    system: SUMMARIZE_MEETING_SYSTEM_PROMPT,
    user: transcript,
    temperature: 0.2,
  });

  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("Meeting summarization returned no JSON");
  }

  let parsed: Partial<MeetingInsight>;
  try {
    parsed = JSON.parse(match[0]);
  } catch {
    throw new Error("Invalid JSON returned from meeting summarization");
  }

  const normalized = {
    summary: parsed.summary ?? "",
  
    keyLearnings:
      (parsed as any).keyLearnings ??
      (parsed as any).key_learnings ??
      [],
  
    followUps:
      (parsed as any).followUps ??
      (parsed as any).follow_ups ??
      [],
  
    openQuestions:
      (parsed as any).openQuestions ??
      (parsed as any).open_questions ??
      [],
  };
  
  return normalized;
}

/* -----------------------------------------
 * SPACE AI — Q&A
 * ----------------------------------------- */

function buildSpaceContext(space: MeetingSpace): string {
    return space.records
      .filter((r) => r.insight)
      .map(
        (r, i) => `
  MEETING ${i + 1}
  Title: ${r.title}
  Date: ${r.date}
  
  KEY LEARNINGS:
  ${r.insight!.keyLearnings.join("\n") || "None"}
  
  FOLLOW-UPS:
  ${r.insight!.followUps.join("\n") || "None"}
  
  OPEN QUESTIONS:
  ${r.insight!.openQuestions.join("\n") || "None"}
  `.trim()
      )
      .join("\n\n====================\n\n");
  }
export async function chatWithSpace(
  query: string,
  space: MeetingSpace
): Promise<string> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    throw new Error("chatWithSpace: query is empty");
  }

  const context = buildSpaceContext(space);

  // 🚨 Critical guard: no processed meetings yet
  if (!context.trim()) {
    return "I don’t have any processed meeting information for this space yet.";
  }

  const response = await callAI({
    system: SPACE_QA_SYSTEM_PROMPT,
    user: `
Context:
${context}

Question:
${trimmedQuery}
`.trim(),
    temperature: 0.2,
  });

  return response;
}