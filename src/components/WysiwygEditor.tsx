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

  onEditorReady?: (el: HTMLElement) => void; // ⭐ NEW
}

export const WysiwygEditor: React.FC<WysiwygEditorProps> = ({
  initialContent,
  onChange,
  onBlur,
  placeholder,
  className,
  autoFocus,
  onEditorReady, // ⭐ NEW
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const [showToolbar, setShowToolbar] = useState(false);

  // -------------------------------------------------
  // Move caret to very top of editor
  // -------------------------------------------------
  const focusAtTop = () => {
    const el = editorRef.current;
    if (!el) return;

    el.focus();

    const range = document.createRange();
    range.setStart(el, 0);
    range.collapse(true);

    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  };

  // -------------------------------------------------
  // INITIALIZATION + notify TaskCard when ready
  // -------------------------------------------------
  useEffect(() => {
    if (editorRef.current && !isInitialized.current) {
      editorRef.current.innerHTML = markdownToHtml(initialContent);
      isInitialized.current = true;

      // Notify parent once the DOM exists
      if (onEditorReady) {
        onEditorReady(editorRef.current);
      }

      if (autoFocus) {
        requestAnimationFrame(() => {
          focusAtTop();
        });
      }
    }
  }, [initialContent, autoFocus, onEditorReady]);

  // -------------------------------------------------
  // INPUT HANDLING
  // -------------------------------------------------
  const handleInput = () => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
  };

  // -------------------------------------------------
  // execCommand wrapper
  // -------------------------------------------------
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
      const node = document.createTextNode(value);
      range.insertNode(node);

      range.setStartAfter(node);
      range.collapse(true);

      sel.removeAllRanges();
      sel.addRange(range);

      handleInput();
      return;
    }

    document.execCommand(command, false, value);
    handleInput();
  };

  // -------------------------------------------------
  // KEYBOARD: Tab indent/outdent + formatting
  // -------------------------------------------------
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      e.preventDefault();

      if (e.shiftKey) {
        document.execCommand("outdent");
      } else {
        document.execCommand("indent");
      }
      handleInput();
      return;
    }

    if (!(e.metaKey || e.ctrlKey)) return;
    const key = e.key.toLowerCase();

    if (key === "b") {
      e.preventDefault();
      execCommand("bold");
    } else if (key === "i") {
      e.preventDefault();
      execCommand("italic");
    } else if (key === "u") {
      e.preventDefault();
      execCommand("underline");
    }
  };

  // -------------------------------------------------
  // Automatic list detection
  // -------------------------------------------------
  const handleKeyUp = (e: React.KeyboardEvent) => {
    if (e.key !== " ") return;

    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) return;

    const text = sel.anchorNode.textContent || "";
    const olMatch = text.match(/^1\.\s/);
    const ulMatch = text.match(/^[\-\*]\s/);

    if (!olMatch && !ulMatch) return;

    const parentEl = (sel.anchorNode as any).parentElement;
    const parentList = parentEl?.closest("ul, ol");
    if (parentList) return;

    const length = olMatch ? 3 : ulMatch ? 2 : 0;

    const range = document.createRange();
    range.setStart(sel.anchorNode, 0);
    range.setEnd(sel.anchorNode, length);
    range.deleteContents();

    execCommand(olMatch ? "insertOrderedList" : "insertUnorderedList");
  };

  // -------------------------------------------------
  // AI completion handler
  // -------------------------------------------------
  const handleAiComplete = (newHtml: string) => {
    if (!editorRef.current) return;
    editorRef.current.innerHTML = newHtml;
    onChange(newHtml);
  };

  // -------------------------------------------------
  // BLUR / FOCUS
  // -------------------------------------------------
  const handleBlurInternal = (e: React.FocusEvent) => {
    const related = e.relatedTarget as HTMLElement | null;
    if (related?.closest(".editor-toolbar-container")) return;

    setShowToolbar(false);
    onBlur();
  };

  const handleFocus = () => {
    setShowToolbar(true);
  };

  // Expose method for parent (TaskCard)
  (editorRef as any).focusAtTop = focusAtTop;

  // -------------------------------------------------
  // RENDER
  // -------------------------------------------------
  return (
    <div className={cn("relative group font-normal", className)}>
      {/* Toolbar */}
      <div
        className={cn(
          "absolute bottom-full left-0 mb-1 z-50 editor-toolbar-container transition-opacity duration-200",
          showToolbar ? "opacity-100 visible" : "opacity-0 invisible"
        )}
      >
        <EditorToolbar
          onFormat={execCommand}
          currentContent={editorRef.current?.innerText || ""}
          onAiComplete={handleAiComplete}
        />
      </div>

      {/* Editable Area */}
      <div
        ref={editorRef}
        contentEditable
        tabIndex={0} // ⭐ KEY FIX: allows single-click and tab focus
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
        div[contentEditable] h1 { font-size: 1.1em; font-weight: 700; }
        div[contentEditable] h2 { font-size: 1.05em; font-weight: 600; }
        div[contentEditable] ul { list-style-type: disc; padding-left: 1.2em; }
        div[contentEditable] ol { list-style-type: decimal; padding-left: 1.2em; }
        div[contentEditable] li { margin-bottom: 0.15em; }
      `}</style>
    </div>
  );
};