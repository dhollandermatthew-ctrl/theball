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

  const htmlContent = markdownToHtml(text);

  return (
    <div className={cn("break-words", isCompleted && "opacity-60", className)}>
      <div
        className={cn(
          "rich-text-content",
          isCompleted && "line-through-elements"
        )}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      <style>{`
        .rich-text-content {
          font-size: 12px;
          line-height: 1.25;
          color: #0f172a;
        }

        /* Normalize pasted text safely */
        .rich-text-content * {
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
          color: inherit;
        }

        .rich-text-content p {
          margin: 0.25em 0;
        }

        /* ✅ Lists (SAFE) */
        .rich-text-content ul {
          list-style-type: disc;
        }

        .rich-text-content ol {
          list-style-type: decimal;
        }

        .rich-text-content ul,
        .rich-text-content ol {
          padding-left: 1.25em;
          margin: 0.25em 0;
        }

        .rich-text-content li {
          margin: 0.15em 0;
        }

        /* Headings collapse to body size */
        .rich-text-content h1,
        .rich-text-content h2,
        .rich-text-content h3 {
          font-size: 12px;
          font-weight: 600;
          margin: 0.35em 0 0.2em;
        }

        .rich-text-content a {
          color: #2563eb;
          text-decoration: underline;
        }

        .line-through-elements * {
          text-decoration: line-through;
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
};