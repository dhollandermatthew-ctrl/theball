import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { marked } from "marked";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Generate unique IDs
export const generateId = () =>
  Math.random().toString(36).slice(2) +
  Math.random().toString(36).slice(2);

// Convert Date → "YYYY-MM-DD"
export const formatDateKey = (date: Date): string =>
  date.toISOString().split("T")[0];

// Random color for tags/person icons
export const getRandomColor = () => {
  const colors = [
    'bg-red-500', 'bg-orange-500', 'bg-amber-500',
    'bg-yellow-500', 'bg-lime-500', 'bg-green-500',
    'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500',
    'bg-sky-500', 'bg-blue-500', 'bg-indigo-500',
    'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500',
    'bg-pink-500', 'bg-rose-500'
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

// NEW — Default Title + Body for tasks
export const DEFAULT_TASK_TITLE = "New Task";
export const DEFAULT_TASK_BODY = "";

/**
 * Proper Markdown → HTML conversion using `marked`
 * Handles:
 * - bullet lists
 * - numbered lists
 * - nested lists
 * - headings (#, ##, ###)
 * - bold/italic
 * - links
 * - line breaks
 */


export const markdownToHtml = (markdown: string): string => {
  if (!markdown) return "";

  // If already HTML, skip markdown parsing
  if (/<[a-z][\s\S]*>/i.test(markdown)) return markdown;

  // Force marked to run in synchronous mode
  const html = marked.parse(markdown, { async: false }) as string;

  return html;
};