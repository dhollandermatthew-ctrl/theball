// FILE: src/components/RichTextRenderer.tsx

import React from "react";
import { cn, markdownToHtml } from "@/domain/utils";

interface RichTextRendererProps {
  text: string;
  isCompleted?: boolean;
  className?: string;
}

export const RichTextRenderer: React.FC<RichTextRendererProps> = ({
  text,
  isCompleted = false,
  className,
}) => {
  if (!text) return null;

  // Convert legacy markdown → HTML (no-op if already HTML)
  const htmlContent = markdownToHtml(text);

  return (
    <div
      className={cn(
        "break-words",
        isCompleted && "opacity-60",
        className
      )}
    >
      <div
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        className={cn(
          "rich-text",
          isCompleted && "rich-text--completed"
        )}
      />

      <style>{`
/* ----------------------------------------
   BASE
---------------------------------------- */
.rich-text {
  font-size: 13px;
  line-height: 1.45;
  color: #0f172a; /* slate-900 */
}

/* Reset weird pasted margins */
.rich-text > * {
  margin-top: 0;
  margin-bottom: 6px;
}

/* ----------------------------------------
   PARAGRAPHS
---------------------------------------- */
.rich-text p {
  margin: 0 0 6px 0;
}

/* ----------------------------------------
   HEADINGS (INTENTIONALLY SUBTLE)
---------------------------------------- */
.rich-text h1 {
  font-size: 14px;
  font-weight: 700;
  margin: 8px 0 4px;
}

.rich-text h2 {
  font-size: 13px;
  font-weight: 700;
  margin: 8px 0 4px;
}

.rich-text h3 {
  font-size: 13px;
  font-weight: 600;
  margin: 6px 0 4px;
}

/* ----------------------------------------
   LISTS
---------------------------------------- */
.rich-text ul,
.rich-text ol {
  padding-left: 1.1em;
  margin: 4px 0;
}

.rich-text li {
  margin: 2px 0;
}

/* ----------------------------------------
   LINKS
---------------------------------------- */
.rich-text a {
  color: #2563eb; /* blue-600 */
  text-decoration: underline;
  word-break: break-all;
}

.rich-text a:hover {
  color: #1d4ed8;
}

/* ----------------------------------------
   CODE (INLINE)
---------------------------------------- */
.rich-text code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  background: #f1f5f9;
  padding: 1px 4px;
  border-radius: 4px;
}

/* ----------------------------------------
   BLOCKQUOTES
---------------------------------------- */
.rich-text blockquote {
  border-left: 2px solid #e2e8f0;
  padding-left: 8px;
  color: #475569;
  margin: 6px 0;
}

/* ----------------------------------------
   COMPLETED STATE
---------------------------------------- */
.rich-text--completed {
  color: #64748b; /* slate-500 */
}

.rich-text--completed * {
  text-decoration: line-through;
  text-decoration-thickness: 1px;
}
      `}</style>
    </div>
  );
};