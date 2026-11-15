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

  const system = `You are a personal knowledge assistant. The user has a library of learning artifacts — interactive HTML documents they built in Claude on topics they're studying or working on.

Answer the user's question using ONLY information from the provided artifacts.

Rules:
- Be direct and specific. Reference the artifact content closely.
- At the end, include a SOURCES section listing the artifact IDs you drew from, one per line, as: [ART_N]
- If the artifacts don't contain a relevant answer, say so clearly.
- Do not add information not present in the artifacts.`;

  const userPrompt = `Here are my artifacts:\n\n${docsBlock}\n\n---\n\nMy question: ${question}`;

  const raw = await callAI({ system, user: userPrompt, temperature: 0.2 });

  // Parse SOURCES block to extract artifact ids
  const sourcesMatch = raw.match(/SOURCES[\s\S]*$/i);
  const answerText = sourcesMatch
    ? raw.slice(0, raw.indexOf(sourcesMatch[0])).trim()
    : raw.trim();

  const sourceIds: string[] = [];
  if (sourcesMatch) {
    const lines = sourcesMatch[0].split('\n').slice(1);
    for (const line of lines) {
      const m = line.match(/\[ART_(\d+)\]/);
      if (!m) continue;
      const idx = parseInt(m[1], 10) - 1;
      if (idx >= 0 && idx < scored.length) {
        sourceIds.push(scored[idx].artifact.id);
      }
    }
  }

  return { answer: answerText, sourceIds };
}
