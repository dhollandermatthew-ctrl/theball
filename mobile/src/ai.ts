import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export interface ParsedTask {
  title: string;
  date: string;
  priority: 'p1' | 'p2' | 'p3';
  category: 'work' | 'personal';
}

export async function parseTask(input: string): Promise<ParsedTask> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const today = new Date().toISOString().split('T')[0];

  const prompt = `Parse this task and return JSON only (no markdown, no explanation):
"${input}"

Today is ${today} (${new Date().toLocaleDateString('en-US', { weekday: 'long' })}).

{
  "title": "clean, concise task title",
  "date": "YYYY-MM-DD (default to today if no date mentioned)",
  "priority": "p1|p2|p3",
  "category": "work|personal"
}

Priority:
- p1: real deadline today/tomorrow, someone is waiting, or directly compounds active skill/project
- p2: important but not time-pressured right now
- p3: good idea, no urgency`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim().replace(/```json\n?|\n?```/g, '');
  return JSON.parse(text) as ParsedTask;
}
