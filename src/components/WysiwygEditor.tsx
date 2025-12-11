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