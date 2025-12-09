// src/components/WysiwygEditor.tsx
import React, { useRef, useEffect, useState } from "react";
import { EditorToolbar } from "./EditorToolbar";
import { cn, markdownToHtml } from "../domain/utils";

interface WysiwygEditorProps {
  initialContent: string;
  onChange: (html: string) => void;
  onBlur: () => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const WysiwygEditor: React.FC<WysiwygEditorProps> = ({
  initialContent,
  onChange,
  onBlur,
  placeholder,
  className,
  autoFocus,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const [showToolbar, setShowToolbar] = useState(false);

  // -----------------------------
  // INITIALIZE CONTENT + CURSOR
  // -----------------------------
  useEffect(() => {
    if (editorRef.current && !isInitialized.current) {
      editorRef.current.innerHTML = markdownToHtml(initialContent);
      isInitialized.current = true;

      if (autoFocus) {
        requestAnimationFrame(() => {
          if (!editorRef.current) return;

          editorRef.current.focus();

          const h2 = editorRef.current.querySelector("h2");
          const emptyLi = editorRef.current.querySelector("li:empty");
          const range = document.createRange();
          const sel = window.getSelection();

          if (h2) {
            range.selectNodeContents(h2);
          } else if (emptyLi) {
            range.selectNodeContents(emptyLi);
          } else {
            range.selectNodeContents(editorRef.current);
          }

          range.collapse(false);
          sel?.removeAllRanges();
          sel?.addRange(range);
        });
      }
    }
  }, [initialContent, autoFocus]);

  const handleInput = () => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
  };

  // -------------------------------------------
  // EXEC COMMAND (with custom "insertText")
  // -------------------------------------------
  const execCommand = (command: string, value?: string) => {
    if (!editorRef.current) return;

    editorRef.current.focus();

    if (command === "insertText" && typeof value === "string") {
      const sel = window.getSelection();
      let range: Range;

      if (!sel || sel.rangeCount === 0) {
        range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
      } else {
        range = sel.getRangeAt(0);
      }

      range.deleteContents();
      const textNode = document.createTextNode(value);
      range.insertNode(textNode);

      range.setStartAfter(textNode);
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);

      handleInput();
      return;
    }

    document.execCommand(command, false, value);
    handleInput();
  };

  // -------------------------------------------
  // KEYBOARD SHORTCUTS (Ctrl/Cmd + B/I/U)
  // -------------------------------------------
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // -----------------------------
    // TAB → indent / outdent
    // -----------------------------
    if (e.key === "Tab") {
      e.preventDefault();
  
      // Shift+Tab = outdent
      if (e.shiftKey) {
        document.execCommand("outdent");
      } else {
        // Tab = indent
        document.execCommand("indent");
      }
  
      handleInput();
      return;
    }
  
    // -----------------------------
    // FORMAT SHORTCUTS (Ctrl/Cmd)
    // -----------------------------
    if (!(e.metaKey || e.ctrlKey)) return;
  
    const key = e.key.toLowerCase();
  
    if (key === "b") {
      e.preventDefault();
      execCommand("bold");
      return;
    }
    if (key === "i") {
      e.preventDefault();
      execCommand("italic");
      return;
    }
    if (key === "u") {
      e.preventDefault();
      execCommand("underline");
      return;
    }
  
    // Ordered list: Cmd+Shift+7  
    // Bullet list: Cmd+Shift+8
    if (e.shiftKey && (key === "7" || key === "8")) {
      e.preventDefault();
      execCommand(key === "7" ? "insertOrderedList" : "insertUnorderedList");
    }
  };

  // -------------------------------------------
  // AUTO-LIST: "1. " and "- "
  // -------------------------------------------
  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key !== " ") return;

    const selection = window.getSelection();
    if (!selection || !selection.anchorNode) return;

    const anchorNode = selection.anchorNode;
    if (anchorNode.nodeType !== Node.TEXT_NODE) return;

    const textContent = anchorNode.textContent || "";

    const olMatch = textContent.match(/^1\.\s/);
    const ulMatch = textContent.match(/^[\-\*]\s/);

    if (!olMatch && !ulMatch) return;

    const parentEl = (anchorNode as any).parentElement as HTMLElement | null;
    const parentList = parentEl?.closest("ul, ol");
    if (parentList) {
      const isOl = parentList.tagName === "OL";
      const isUl = parentList.tagName === "UL";
      if ((olMatch && isOl) || (ulMatch && isUl)) return;
    }

    const matchLength = olMatch
      ? olMatch[0].length
      : ulMatch
      ? ulMatch[0].length
      : 0;

    const range = document.createRange();
    range.setStart(anchorNode, 0);
    range.setEnd(anchorNode, matchLength);
    range.deleteContents();

    if (olMatch) {
      execCommand("insertOrderedList");
    } else {
      execCommand("insertUnorderedList");
    }
  };

  const handleAiComplete = (newHtml: string) => {
    if (!editorRef.current) return;
    editorRef.current.innerHTML = newHtml;
    onChange(newHtml);
  };

  const handleBlurInternal = (e: React.FocusEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    if (relatedTarget && relatedTarget.closest(".editor-toolbar-container")) {
      return;
    }
    setShowToolbar(false);
    onBlur();
  };

  const handleFocus = () => {
    setShowToolbar(true);
  };

  return (
    <div className={cn("relative group font-normal", className)}>
      {/* Toolbar */}
      <div
        className={cn(
          "absolute bottom-full left-0 mb-1 z-50 editor-toolbar-container transition-opacity duration-200",
          showToolbar
            ? "opacity-100 visible"
            : "opacity-0 invisible pointer-events-none"
        )}
      >
        <EditorToolbar
          onFormat={execCommand}
          currentContent={editorRef.current?.innerText || ""}
          onAiComplete={handleAiComplete}
        />
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={handleBlurInternal}
        onFocus={handleFocus}
        className="w-full min-h-[24px] outline-none text-sm leading-snug empty:before:content-[attr(data-placeholder)] empty:before:text-slate-400 p-0.5"
        data-placeholder={placeholder}
      />

      <style>{`
        div[contentEditable] h1 { font-size: 1.1em; font-weight: 700; margin-bottom: 0.2em; margin-top: 0.4em; }
        div[contentEditable] h2 { font-size: 1.05em; font-weight: 600; margin-bottom: 0.2em; margin-top: 0.4em; }
        div[contentEditable] ul { list-style-type: disc; padding-left: 1.2em; margin: 0.2em 0; }
        div[contentEditable] ol { list-style-type: decimal; padding-left: 1.2em; margin: 0.2em 0; }
        div[contentEditable] li { margin-bottom: 0.1em; }
        div[contentEditable] b { font-weight: 600; }
        div[contentEditable] i { font-style: italic; }
        div[contentEditable] a { color: #3b82f6; text-decoration: underline; cursor: pointer; }
        div[contentEditable] blockquote { border-left: 2px solid #cbd5e1; padding-left: 0.5em; color: #64748b; font-style: italic; }
      `}</style>
    </div>
  );
};