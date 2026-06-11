import { callAI } from "./ai";
import type { ProductKnowledgeItem } from "../types";

export interface KnowledgeAnswer {
  answer: string;
  citations: { title: string; id: string; excerpt: string }[];
}

const MAX_CONTENT_PER_ITEM = 4000;

export async function askKnowledgeBase(
  question: string,
  items: ProductKnowledgeItem[]
): Promise<KnowledgeAnswer> {
  const itemsWithContent = items.filter((i) => i.content && i.content.trim().length > 50);

  if (itemsWithContent.length === 0) {
    return {
      answer: "No documents with content found in your knowledge base. Upload some documents or notes first.",
      citations: [],
    };
  }

  const docsBlock = itemsWithContent
    .map((item, idx) => {
      const snippet = (item.content || "").substring(0, MAX_CONTENT_PER_ITEM);
      return `[DOC_${idx + 1}] Title: "${item.title}"\n${snippet}`;
    })
    .join("\n\n---\n\n");

  const system = `You are a personal knowledge assistant. The user has a library of documents, book notes, and knowledge items. Answer the user's question using ONLY information from the provided documents.

Rules:
- Be direct and specific. Quote or closely paraphrase the source material.
- At the end of your answer, include a CITATIONS section listing which documents you drew from.
- Format citations as: [DOC_N] "Title" — one sentence on what you used from it.
- If the documents don't contain a relevant answer, say so clearly.
- Do not hallucinate information not in the documents.`;

  const userPrompt = `Here are my knowledge base documents:

${docsBlock}

---

My question: ${question}`;

  const raw = await callAI({ system, user: userPrompt, temperature: 0.2 });

  // Parse citations block out of the response
  const citationsMatch = raw.match(/CITATIONS[\s\S]*$/i);
  const answerText = citationsMatch
    ? raw.slice(0, raw.indexOf(citationsMatch[0])).trim()
    : raw.trim();

  const citations: KnowledgeAnswer["citations"] = [];
  if (citationsMatch) {
    const citationLines = citationsMatch[0].split("\n").slice(1);
    for (const line of citationLines) {
      const docMatch = line.match(/\[DOC_(\d+)\]/);
      if (!docMatch) continue;
      const idx = parseInt(docMatch[1], 10) - 1;
      if (idx >= 0 && idx < itemsWithContent.length) {
        const item = itemsWithContent[idx];
        citations.push({
          id: item.id,
          title: item.title,
          excerpt: line.replace(/\[DOC_\d+\]\s*"[^"]*"\s*—?\s*/, "").trim(),
        });
      }
    }
  }

  return { answer: answerText, citations };
}
