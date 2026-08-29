import { callAI } from "./ai";

export async function sharpenPlaybook(title: string, content: string): Promise<string> {
  const system = `You are helping a product manager turn their rough book notes into a practical field guide they can reference during strategy and discovery meetings.

Your job:
1. Add a "## Quick Reference" block at the very top — the 5 most important principles to remember in the moment, as short punchy bullets
2. Restructure the rest into clear sections with headers (## Framework, ## Key Questions, ## Red Flags, ## Examples, etc.) — use whatever sections fit the material
3. Preserve the author's frameworks and terminology exactly — do not editorialize or invent
4. Keep it under 5 pages / ~2000 words
5. Output clean Markdown only — no preamble, no "here is your document" wrapper

The output should be something you can glance at 5 minutes before a meeting and immediately know what to do.`;

  const user = `Book / document title: "${title}"

Here are my notes:

${content}`;

  return callAI({ system, user, temperature: 0.3 });
}
