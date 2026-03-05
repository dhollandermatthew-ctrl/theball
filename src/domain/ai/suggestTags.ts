// FILE: src/domain/ai/suggestTags.ts
import { callAI } from "./ai";

const SUGGEST_TAGS_SYSTEM_PROMPT = `You are a Product Management knowledge organizer. Your task is to suggest relevant tags for PM knowledge items.

Given a title and content, suggest 3-5 concise, relevant tags that help categorize the knowledge.

**Tag Guidelines:**
- Use common PM terminology (e.g., "competitor analysis", "frameworks", "AI tools", "UX research")
- Keep tags short (1-3 words)
- Use lowercase
- Focus on topics, not actions
- Be specific enough to be useful for filtering

**Output Format:**
Return ONLY a JSON array of strings, nothing else.

Example output:
["competitor analysis", "AI tools", "product strategy"]`;

export async function suggestTags(title: string, content: string): Promise<string[]> {
  if (!title.trim() && !content.trim()) {
    throw new Error("Title and content are both empty");
  }

  const userPrompt = `Title: ${title}

Content:
${(content || '').substring(0, 2000)}`;

  try {
    const response = await callAI({
      system: SUGGEST_TAGS_SYSTEM_PROMPT,
      user: userPrompt,
      temperature: 0.3,
    });

    // Extract JSON array
    const match = response.match(/\[[\s\S]*?\]/);
    if (!match) {
      console.error("No JSON array found in AI response:", response);
      return [];
    }

    const tags = JSON.parse(match[0]);
    
    if (!Array.isArray(tags)) {
      console.error("AI response is not an array:", tags);
      return [];
    }

    // Validate and clean tags
    return tags
      .filter((tag) => typeof tag === "string" && tag.trim().length > 0)
      .map((tag) => tag.trim().toLowerCase())
      .slice(0, 5); // Max 5 tags

  } catch (err) {
    console.error("Tag suggestion error:", err);
    return [];
  }
}
