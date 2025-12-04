import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const generateId = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

export const formatDateKey = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

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

export const DEFAULT_TASK_CONTENT =
  "<h2>Title</h2><ul><li></li></ul>";

// Simple Markdown → HTML
export const markdownToHtml = (markdown: string): string => {
  if (!markdown) return '';

  // If already HTML, skip
  if (/<[a-z][\s\S]*>/i.test(markdown)) return markdown;

  let html = markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*)\*\*/gim, '<b>$1</b>')
    .replace(/\*(.*)\*/gim, '<i>$1</i>')
    // Bullet: "-" or "*" at start of line
    .replace(/^\s*[-*]\s+(.*)$/gim, '<li>$1</li>')

    // Numbered list: "1. text"
    .replace(/^\s*\d+\.\s+(.*)$/gim, '<li>$1</li>')
    .replace(/\n/gim, '<br />');

  html = html.replace(/<\/ul>\s*<ul>/gim, '');
  html = html.replace(/<\/ol>\s*<ol>/gim, '');

  return html;
};