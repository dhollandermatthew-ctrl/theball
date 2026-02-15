// FILE: src/domain/ai/buildSpaceContext.ts

import { SpaceAgentContext } from "./spaceAgent";
import { MeetingSpace } from "@/domain/types";

/**
 * Builds the ONLY context the Space Agent is allowed to see.
 * This function must remain pure and deterministic.
 */
export function buildSpaceContext(space: MeetingSpace): SpaceAgentContext {
  return {
    meetings: space.records.map((record) => ({
      id: record.id,
      title: record.title,
      date: record.date,
      transcript: normalizeText(record.transcript),
      insight: record.insight
        ? normalizeText(stringifyInsight(record.insight))
        : undefined,
    })),

    notes: (space.spaceNotes ?? []).map((note) => ({
      id: note.id,
      title: note.title,
      content: normalizeText(note.content),
    })),
  };
}
function normalizeText(text: string): string {
    return text
      .replace(/\s+/g, " ")
      .replace(/\n+/g, "\n")
      .trim();
  }
  
  /**
   * Flattens structured insight into readable text
   * without introducing interpretation.
   */
  function stringifyInsight(insight: any): string {
    const items = [
      ...(insight.keyLearnings ?? []),
      ...(insight.followUps ?? []),
      ...(insight.openQuestions ?? []),
      ...(insight.featureRequests ?? []),
      ...(insight.problemSignals ?? []),
      insight.summary ?? "",
    ];
    
    return items.filter(Boolean).join("\n");
  }