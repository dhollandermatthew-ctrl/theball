import { callAI } from "@/domain/ai/ai";
import { 
  SUMMARIZE_NORMAL_MEETING_PROMPT, 
  SUMMARIZE_DISCOVERY_MEETING_PROMPT 
} from "@/domain/prompts/meetings/summarize.system";
import { SPACE_QA_SYSTEM_PROMPT } from "@/domain/prompts/meetings/spaceQa.system";
import type { MeetingSpace, MeetingInsight } from "@/domain/types";

/* -----------------------------------------
 * TYPES
 * ----------------------------------------- */

interface ProcessMeetingInput {
  transcript: string;
  meetingType?: "normal" | "discovery";
}

/* -----------------------------------------
 * MEETING AI — SUMMARIZATION
 * ----------------------------------------- */

export async function processMeetingTranscript(
  input: ProcessMeetingInput
): Promise<MeetingInsight> {
  const transcript = input.transcript?.trim();
  const meetingType = input.meetingType || "normal"; // Default to normal

  if (!transcript) {
    throw new Error("processMeetingTranscript: transcript is empty");
  }

  // Choose prompt based on meeting type
  const systemPrompt = meetingType === "discovery" 
    ? SUMMARIZE_DISCOVERY_MEETING_PROMPT 
    : SUMMARIZE_NORMAL_MEETING_PROMPT;

  const raw = await callAI({
    system: systemPrompt,
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

  const normalized: MeetingInsight = {
    summary: parsed.summary ?? "",
    participants:
      // Prefer explicit participants array if present
      (parsed as any).participants ??
      // Backwards compatibility / loose model naming
      (parsed as any).attendees ??
      (parsed as any).people ??
      [],

    keyLearnings:
      (parsed as any).keyLearnings ??
      (parsed as any).key_learnings ??
      [],
  
    // Normal call fields
    followUps:
      (parsed as any).followUps ??
      (parsed as any).follow_ups ??
      undefined,
  
    openQuestions:
      (parsed as any).openQuestions ??
      (parsed as any).open_questions ??
      undefined,
    
    // Discovery call fields
    featureRequests:
      (parsed as any).featureRequests ??
      (parsed as any).feature_requests ??
      undefined,
  
    problemSignals:
      (parsed as any).problemSignals ??
      (parsed as any).problem_signals ??
      undefined,
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
        (r, i) => {
          const insight = r.insight!;
          const sections = [
            `MEETING ${i + 1}`,
            `Title: ${r.title}`,
            `Date: ${r.date}`,
            ``,
            `KEY LEARNINGS:`,
            insight.keyLearnings.join("\n") || "None"
          ];
          
          // Add normal call fields if present
          if (insight.followUps && insight.followUps.length > 0) {
            sections.push(``, `FOLLOW-UPS:`, insight.followUps.join("\n"));
          }
          if (insight.openQuestions && insight.openQuestions.length > 0) {
            sections.push(``, `OPEN QUESTIONS:`, insight.openQuestions.join("\n"));
          }
          
          // Add discovery call fields if present
          if (insight.featureRequests && insight.featureRequests.length > 0) {
            sections.push(``, `FEATURE REQUESTS:`, insight.featureRequests.join("\n"));
          }
          if (insight.problemSignals && insight.problemSignals.length > 0) {
            sections.push(``, `PROBLEM SIGNALS:`, insight.problemSignals.join("\n"));
          }
          
          return sections.join("\n");
        }
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
