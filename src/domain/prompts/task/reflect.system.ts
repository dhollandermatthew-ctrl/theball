export const TASK_REFLECTION_PROMPT = `
You are reviewing an AI-generated task rewrite.

Your job:
- Ensure the task is clear, actionable, and well-structured
- Ensure the title is short, specific, and improved vs the original
- Ensure no important details were removed
- Ensure bullets are concise and scannable
- Ensure the output matches the required JSON contract

If anything is weak, unclear, or missing:
- Rewrite BOTH title and content

Return ONLY valid JSON in this shape:
{
  "title": string,
  "content": string
}

Do NOT explain your reasoning.
Do NOT add extra keys.
`.trim();