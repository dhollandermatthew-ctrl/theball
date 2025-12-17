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
          // ✅ escapes Tailwind typography (.prose) rules if parent uses it
          "rich-text-content not-prose",
          isCompleted && "line-through-elements"
        )}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />

      <style>{`
        .rich-text-content {
          font-size: 12px;
          line-height: 1.25;
          color: #0f172a; /* slate-900 */
        }

        /* Normalize pasted junk without nuking list behavior */
        .rich-text-content * {
          font-family: inherit;
          font-size: inherit;
          line-height: inherit;
          color: inherit;
        }

        .rich-text-content p {
          margin: 0.25em 0;
        }

        /* ✅ Force lists + markers to exist */
        .rich-text-content ul {
          list-style-type: disc !important;
        }
        .rich-text-content ol {
          list-style-type: decimal !important;
        }
        .rich-text-content ul,
        .rich-text-content ol {
          list-style-position: outside;
          padding-left: 1.25em;
          margin: 0.25em 0;
        }

        .rich-text-content li {
          display: list-item !important;
          margin: 0.15em 0;
        }

        /* ✅ Force marker rendering even if upstream styles mess with it */
        .rich-text-content li::marker {
          color: currentColor !important;
          font-size: 12px !important;
        }

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
          word-break: break-word;
        }

        .line-through-elements * {
          text-decoration: line-through;
          color: #94a3b8;
        }
      `}</style>
    </div>
  );
};