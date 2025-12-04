import React from 'react';
import { cn, markdownToHtml } from '@/domain/utils';

interface RichTextRendererProps {
  text: string;
  isCompleted?: boolean;
  className?: string;
}

export const RichTextRenderer: React.FC<RichTextRendererProps> = ({ text, isCompleted, className }) => {
  if (!text) return null;
  
  // Ensure we have HTML (convert if it's legacy markdown)
  const htmlContent = markdownToHtml(text);

  return (
    <div 
      className={cn("text-sm leading-relaxed break-words", isCompleted && "opacity-60", className)}
    >
      <div 
        dangerouslySetInnerHTML={{ __html: htmlContent }} 
        className={cn("rich-text-content", isCompleted && "line-through-elements")}
      />
      
      <style>{`
        .rich-text-content h1 { font-size: 1.25em; font-weight: 700; margin-bottom: 4px; margin-top: 8px; color: #1e293b; }
        .rich-text-content h2 { font-size: 1.1em; font-weight: 700; margin-bottom: 4px; margin-top: 8px; color: #334155; }
        .rich-text-content ul { list-style-type: disc; padding-left: 1.2em; margin-top: 4px; margin-bottom: 4px; }
        .rich-text-content ol { list-style-type: decimal; padding-left: 1.2em; margin-top: 4px; margin-bottom: 4px; }
        .rich-text-content a { color: #3b82f6; text-decoration: underline; }
        .rich-text-content a:hover { color: #2563eb; }
        .line-through-elements * { text-decoration: line-through; color: #94a3b8; }
      `}</style>
    </div>
  );
};