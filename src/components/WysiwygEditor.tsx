// FILE: src/components/WysiwygEditor.tsx

import React, { useRef, useEffect, useState } from "react";
import { cn, markdownToHtml } from "../domain/utils";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";

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

  const [showMic, setShowMic] = useState(false);
  const [recording, setRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  /* -------------------------------------------------
   * INSERT TEXT AT CARET
   * ------------------------------------------------- */
  const insertAtCaret = (text: string) => {
    const el = editorRef.current;
    if (!el) return;

    el.focus();

    const sel = window.getSelection();
    if (!sel) return;

    let range = sel.rangeCount ? sel.getRangeAt(0) : document.createRange();
    range.deleteContents();

    const node = document.createTextNode(text);
    range.insertNode(node);

    // move caret afterward
    range = range.cloneRange();
    range.setStartAfter(node);
    range.collapse(true);

    sel.removeAllRanges();
    sel.addRange(range);

    onChange(el.innerHTML);
  };

  /* -------------------------------------------------
   * INITIAL LOAD
   * ------------------------------------------------- */
  useEffect(() => {
    if (editorRef.current && !isInitialized.current) {
      editorRef.current.innerHTML = markdownToHtml(initialContent);
      isInitialized.current = true;

      if (autoFocus) {
        requestAnimationFrame(() => editorRef.current?.focus());
      }
    }
  }, [initialContent, autoFocus]);

  /* -------------------------------------------------
   * INPUT HANDLER
   * ------------------------------------------------- */
  const handleInput = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  /* -------------------------------------------------
   * KEYBOARD SHORTCUTS (Tab, Cmd/Ctrl+B/I/U, Enter in lists)
   * ------------------------------------------------- */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const el = editorRef.current;
    if (!el) return;

    const sel = window.getSelection();
    const anchorNode = sel?.anchorNode || null;

    // Helper: find closest ancestor of a node matching selector
    const closest = (node: Node | null, selector: string): HTMLElement | null => {
      let el: HTMLElement | null =
        node instanceof HTMLElement
          ? node
          : (node?.parentElement as HTMLElement | null);
      while (el) {
        if (el.matches(selector)) return el;
        el = el.parentElement;
      }
      return null;
    };

    // TAB = indent / outdent (never leave editor)
    if (e.key === "Tab") {
      e.preventDefault();

      const inList = !!closest(anchorNode, "li");

      if (inList) {
        // Use outdent/indent for list items
        document.execCommand(e.shiftKey ? "outdent" : "indent");
      } else {
        // Fallback: indent paragraph (blockquote-style)
        if (!e.shiftKey) {
          document.execCommand("indent");
        } else {
          document.execCommand("outdent");
        }
      }
      handleInput();
      return;
    }

    // ENTER in list: empty li => exit list
    if (e.key === "Enter") {
      const li = closest(anchorNode, "li");
      if (li) {
        const text = li.textContent?.replace(/\u200B/g, "").trim() || "";
        if (text === "") {
          // exit list instead of creating a new empty bullet
          e.preventDefault();
          // Insert paragraph after list
          document.execCommand("insertParagraph");
          document.execCommand("outdent");
          handleInput();
          return;
        }
      }
    }

    // Cmd/Ctrl + B/I/U
    const meta = e.metaKey || e.ctrlKey;
    if (meta) {
      const key = e.key.toLowerCase();
      if (key === "b") {
        e.preventDefault();
        document.execCommand("bold");
        handleInput();
        return;
      }
      if (key === "i") {
        e.preventDefault();
        document.execCommand("italic");
        handleInput();
        return;
      }
      if (key === "u") {
        e.preventDefault();
        document.execCommand("underline");
        handleInput();
        return;
      }
    }
  };

  /* -------------------------------------------------
   * AUTO LIST DETECTION (e.g., "- " or "1. ")
   * ------------------------------------------------- */
  const handleKeyUp = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== " ") return; // only care when space is pressed

    const el = editorRef.current;
    if (!el) return;

    const sel = window.getSelection();
    if (!sel || !sel.anchorNode) return;

    const anchorNode = sel.anchorNode;
    const parent = anchorNode.parentElement;
    if (!parent) return;

    // Already inside a list? bail.
    if (parent.closest("ul, ol")) return;

    const text = anchorNode.textContent || "";

    // Patterns: "- ", "* ", "+ " or "1. ", "1) ", "2) " etc.
    const bulletMatch = text.match(/^(\-|\*|\+)\s$/);
    const orderedMatch = text.match(/^(\d+)([.)])\s$/);

    if (!bulletMatch && !orderedMatch) return;

    const prefixLength = bulletMatch
      ? 2 // "- "
      : orderedMatch
      ? orderedMatch[0].length
      : 0;

    if (!prefixLength) return;

    // Delete the typed prefix from the text node
    const range = document.createRange();
    range.setStart(anchorNode, 0);
    range.setEnd(anchorNode, prefixLength);
    range.deleteContents();

    // Convert to list
    if (bulletMatch) {
      document.execCommand("insertUnorderedList");
    } else if (orderedMatch) {
      document.execCommand("insertOrderedList");
    }

    handleInput();
  };

  /* -------------------------------------------------
   * START RECORDING (real)
   * ------------------------------------------------- */
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstart = () => {
        setRecording(true);
      };

      recorder.onstop = async () => {
        setRecording(false);
        stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: "audio/webm" });

        setIsSending(true);
        try {
          const arrayBuffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);

          const text = await invoke<string>("transcribe_audio", {
            audio: Array.from(bytes),
            apiKey: import.meta.env.VITE_OPENAI_API_KEY,
          });

          if (text) insertAtCaret(text + " ");
        } finally {
          setIsSending(false);
        }
      };

      recorder.start();
    } catch {
      alert("Microphone permission denied.");
    }
  };

  /* -------------------------------------------------
   * STOP RECORDING
   * ------------------------------------------------- */
  const stopRecording = () => {
    const r = mediaRecorderRef.current;
    if (r && r.state !== "inactive") r.stop();
  };

  /* -------------------------------------------------
   * MIC TOGGLE BUTTON
   * ------------------------------------------------- */
  const handleMicToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    editorRef.current?.focus();

    if (recording) stopRecording();
    else startRecording();
  };

  /* -------------------------------------------------
   * FOCUS / BLUR LOGIC
   * ------------------------------------------------- */
  const handleFocus = () => setShowMic(true);

  const handleBlur = (e: React.FocusEvent) => {
    const related = e.relatedTarget as HTMLElement | null;

    // Don't blur when clicking mic
    if (related?.dataset?.mic === "1") return;

    setShowMic(false);
    onBlur();
  };

  /* -------------------------------------------------
   * RENDER
   * ------------------------------------------------- */
  return (
    <div className={cn("relative group font-normal", className)}>
      {/* Editable area */}
      <div
        ref={editorRef}
        contentEditable
        tabIndex={0}
        suppressContentEditableWarning
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        className="
          w-full min-h-[24px] outline-none text-sm leading-snug
          empty:before:content-[attr(data-placeholder)]
          empty:before:text-slate-400 p-0.5
        "
        data-placeholder={placeholder}
      />

      {/* Floating Mic Button */}
      <button
        data-mic="1"
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onClick={handleMicToggle}
        className={cn(
          "absolute bottom-1 right-1 p-1 rounded-full shadow transition-all",
          showMic ? "opacity-100" : "opacity-0 pointer-events-none",
          recording || isSending
            ? "bg-red-500 text-white animate-pulse"
            : "bg-slate-200 text-slate-600 hover:bg-slate-300"
        )}
      >
        {isSending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : recording ? (
          <MicOff size={14} />
        ) : (
          <Mic size={14} />
        )}
      </button>

      <style>{`
        div[contentEditable] h1 { font-size: 1.1em; font-weight: 700; }
        div[contentEditable] h2 { font-size: 1.05em; font-weight: 600; }
        div[contentEditable] ul { list-style: disc; padding-left: 1.2em; }
        div[contentEditable] ol { list-style: decimal; padding-left: 1.2em; }
        div[contentEditable] li { margin-bottom: 0.15em; }
      `}</style>
    </div>
  );
};