import { callAI } from "./ai";
import type { SavedArtifact } from "../types";

export interface ArtifactAnswer {
  answer: string;
  sourceIds: string[]; // artifact ids used in the answer
}

const MAX_TEXT_PER_ARTIFACT = 6000;

function scoreRelevance(artifact: SavedArtifact, queryWords: string[]): number {
  const haystack = [
    artifact.title,
    artifact.description,
    artifact.tags.join(' '),
    artifact.textContent || '',
  ].join(' ').toLowerCase();
  return queryWords.filter((w) => haystack.includes(w)).length;
}

export async function askArtifacts(
  question: string,
  artifacts: SavedArtifact[]
): Promise<ArtifactAnswer> {
  const withContent = artifacts.filter((a) => a.textContent && a.textContent.trim().length > 30);

  if (withContent.length === 0) {
    return {
      answer: "None of your saved artifacts have content stored yet. Upload HTML files to enable AI search.",
      sourceIds: [],
    };
  }

  // Score and take the most relevant artifacts (cap at 8 to stay within context)
  const queryWords = question.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const scored = withContent
    .map((a) => ({ artifact: a, score: scoreRelevance(a, queryWords) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const docsBlock = scored
    .map(({ artifact }, idx) => {
      const text = (artifact.textContent || '').substring(0, MAX_TEXT_PER_ARTIFACT);
      return `[ART_${idx + 1}] id="${artifact.id}" title="${artifact.title}"\n${text}`;
    })
    .join('\n\n---\n\n');

  const system = `You are a personal knowledge assistant. Answer the user's question directly and concisely using only the provided artifacts.

Rules:
- Answer as if talking to the person directly. No preamble, no "Based on the artifacts...".
- Be specific and extract the actual facts. Don't summarize what an artifact is about — answer the question.
- Keep it short. A few sentences is usually enough. Use bullet points only if listing genuinely distinct items.
- NEVER mention [ART_N] labels or artifact references in your answer body. Write naturally.
- If the artifacts don't contain the answer, say so in one sentence.
- End with a SOURCES line listing only the artifact numbers you used: SOURCES: [ART_N], [ART_N]`;

  const userPrompt = `Here are my artifacts:\n\n${docsBlock}\n\n---\n\nMy question: ${question}`;

  const raw = await callAI({ system, user: userPrompt, temperature: 0.2 });

  // Parse SOURCES line to extract artifact ids
  const sourcesMatch = raw.match(/SOURCES:\s*(.+)$/im);
  const answerText = sourcesMatch
    ? raw.slice(0, raw.search(/SOURCES:/i)).trim()
    : raw.trim();

  const sourceIds: string[] = [];
  if (sourcesMatch) {
    const nums = sourcesMatch[1].matchAll(/\[ART_(\d+)\]/g);
    for (const m of nums) {
      const idx = parseInt(m[1], 10) - 1;
      if (idx >= 0 && idx < scored.length) {
        sourceIds.push(scored[idx].artifact.id);
      }
    }
  }

  return { answer: answerText, sourceIds };
}
