export interface ParsedTask {
  title: string;
  description: string;
  date: string;
  priority: 'p1' | 'p2' | 'p3';
  category: 'work' | 'personal';
}

export async function parseTask(input: string): Promise<ParsedTask> {
  const today = new Date().toISOString().split('T')[0];

  const prompt = `Parse this task and return JSON only (no markdown, no explanation):
"${input}"

Today is ${today} (${new Date().toLocaleDateString('en-US', { weekday: 'long' })}).

{
  "title": "clean, concise task title (max 60 chars)",
  "description": "preserve ALL details the user mentioned — names, context, actions, outcomes. Quote or closely paraphrase what was said. Never invent details. Use bullet points (dash format) if 2+ distinct things mentioned.",
  "date": "YYYY-MM-DD (default to today if no date mentioned)",
  "priority": "p1|p2|p3",
  "category": "work|personal"
}

Priority:
- p1: real deadline today/tomorrow, someone is waiting, or directly compounds active skill/project
- p2: important but not time-pressured right now
- p3: good idea, no urgency`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${res.status} ${err}`);
  }

  const data = await res.json();
  if (!data.choices?.length) throw new Error('429 no choices returned');
  const text = (data.choices[0].message.content as string).trim().replace(/```json\n?|\n?```/g, '');
  return JSON.parse(text) as ParsedTask;
}
