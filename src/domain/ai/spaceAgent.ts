// FILE: src/domain/ai/spaceAgent.ts

import { buildSpaceContext } from "./buildSpaceContext";
import { callAI } from "@/domain/ai/ai";
import { SPACE_AGENT_SYSTEM_PROMPT } from "../prompts/spaceAgent.system";
import { logSpaceAgentInteraction } from "./logs";
import type { MeetingSpace } from "@/domain/types";

/* ===================== Types ===================== */

export interface SpaceAgentContext {
  meetings: {
    id: string;
    title: string;
    date: string;
    transcript: string;
    insight?: string;
  }[];
  notes: {
    id: string;
    title: string;
    content: string;
  }[];
}

export type SpaceAgentCitation =
  | { type: "meeting"; id: string; title: string; date: string }
  | { type: "note"; id: string; title: string };

export interface SpaceAgentResponse {
  answer: string;
  basedOn: SpaceAgentCitation[];
  confidence: "low" | "medium" | "high";
}

export type SpaceAgentExecutor = (args: {
  space: MeetingSpace;
  question: string;
}) => Promise<SpaceAgentResponse>;

/* ===================== Main executor ===================== */

export const executeSpaceAgent: SpaceAgentExecutor = async ({
  space,
  question,
}) => {
  const context = buildSpaceContext(space);

  if (context.meetings.length === 0 && context.notes.length === 0) {
    return emptyResponse(
      "This space does not contain any meetings or notes yet.",
      "low",
    );
  }

  const serializedContext = JSON.stringify(context, null, 2);

  let modelResponse: string;
  try {
    modelResponse = await callAI({
      system: SPACE_AGENT_SYSTEM_PROMPT,
      user: `
SPACE CONTEXT (authoritative):
${serializedContext}

USER QUESTION:
${question}
      `.trim(),
    });
  } catch (err) {
    console.error("SpaceAgent AI error", err);
    return emptyResponse(
      "The AI backend is unavailable right now (quota or network). Try again later.",
      "low",
    );
  }

  const answer =
    typeof modelResponse === "string"
      ? modelResponse
      : (modelResponse as any)?.content ?? "";

  const response = normalizeResponse(answer, context);

  logSpaceAgentInteraction({
    spaceId: space.id,
    question,
    meetingCount: context.meetings.length,
    noteCount: context.notes.length,
    referencedMeetings: response.basedOn
      .filter((c) => c.type === "meeting")
      .map((c) => c.id),
    timestamp: new Date().toISOString(),
  });

  return response;
};

// Optional alias if other code uses this name
export const runSpaceAgent = executeSpaceAgent;

/* ===================== Helpers ===================== */

function emptyResponse(
  message: string,
  confidence: SpaceAgentResponse["confidence"],
): SpaceAgentResponse {
  return {
    answer: message,
    basedOn: [],
    confidence,
  };
}

/**
 * Shapes the model output into a strict response contract.
 * Citations are intentionally conservative.
 */
function normalizeResponse(
  answer: string,
  context: SpaceAgentContext,
): SpaceAgentResponse {
  const basedOn = extractCitations(answer, context);

  return {
    answer: answer.trim(),
    basedOn,
    confidence: basedOn.length > 0 ? "high" : "medium",
  };
}

/**
 * Extracts explicit citations only.
 * Never infers sources.
 */
function extractCitations(
  text: string,
  context: SpaceAgentContext,
): SpaceAgentCitation[] {
  const citations: SpaceAgentCitation[] = [];

  context.meetings.forEach((m) => {
    if (text.includes(m.title) || text.includes(m.date)) {
      citations.push({
        type: "meeting",
        id: m.id,
        title: m.title,
        date: m.date,
      });
    }
  });

  context.notes.forEach((n) => {
    if (text.includes(n.title)) {
      citations.push({
        type: "note",
        id: n.id,
        title: n.title,
      });
    }
  });

  return citations;
}
