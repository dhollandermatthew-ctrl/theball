// src/components/EditorToolbar.tsx
import React, { useState, useRef } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Link as LinkIcon,
  Sparkles,
  Smile,
  Mic,
  MicOff,
  Loader2,
} from "lucide-react";

import { cn } from "../domain/utils";
import { runAI } from "../domain/ai/ai";
import { invoke } from "@tauri-apps/api/core";

const EMOJIS = [
  "🚀", "📈", "💼", "🔥", "⭐", "📅", "🧠", "✨",
  "😀", "😃", "😉", "😎", "🤔", "🤓", "😍",
  "🥳", "🎉", "🤯", "💬", "📝", "📌", "📎",
];

export interface EditorToolbarProps {
  onFormat: (command: string, value?: string) => void;
  currentContent: string;
  onAiComplete: (newContent: string) => void;
  className?: string;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  onFormat,
  currentContent,
  onAiComplete,
  className,
}) => {
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);

  const handleAiify = async () => {
    if (!currentContent.trim()) return;
    setIsAiLoading(true);

    try {
      const prompt = `Rewrite this text to be clearer, more concise, and more polished:\n\n${currentContent}`;
      const cleaned = await runAI(prompt);
      if (cleaned) onAiComplete(cleaned);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleLink = () => {
    const sel = window.getSelection();
    const selectedText = sel?.toString() || "";

    const defaultUrl =
      selectedText.startsWith("http") || selectedText.startsWith("www.")
        ? selectedText
        : "";

    const url = window.prompt("Enter URL", defaultUrl);
    if (!url) return;

    const normalized = url.startsWith("http")
      ? url.trim()
      : "https://" + url.trim();

    document.execCommand("createLink", false, normalized);
  };

  const insertEmoji = (emoji: string) => {
    onFormat("insertText", emoji);
    setShowEmoji(false);
  };

  const Btn = ({
    icon: Icon,
    cmd,
    arg,
    title,
  }: {
    icon: React.ComponentType<{ size?: number }>;
    cmd: string;
    arg?: string;
    title: string;
  }) => (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onFormat(cmd, arg);
      }}
      className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-900 transition-colors"
      title={title}
    >
      <Icon size={14} />
    </button>
  );

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("Microphone not supported.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstart = () => {
        setIsRecording(true);
      };

      recorder.onstop = async () => {
        setIsRecording(false);
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

          if (text) onFormat("insertText", text + " ");
        } finally {
          setIsSending(false);
        }
      };

      recorder.start();
    } catch (err) {
      alert("Microphone access denied.");
    }
  };

  const stopRecording = () => {
    const r = mediaRecorderRef.current;
    if (r && r.state !== "inactive") r.stop();
  };

  const toggleRecording = () => {
    if (isRecording) stopRecording();
    else startRecording();
  };

  const micBusy = isRecording || isSending;

  return (
    <div
      className={cn(
        "relative flex items-center gap-0.5 bg-slate-50 border border-slate-200 rounded-md shadow-sm p-0.5 select-none",
        className
      )}
    >
      <Btn icon={Heading1} cmd="formatBlock" arg="H1" title="Heading 1" />
      <Btn icon={Heading2} cmd="formatBlock" arg="H2" title="Heading 2" />

      <div className="w-px h-3 bg-slate-300 mx-1" />

      <Btn icon={Bold} cmd="bold" title="Bold" />
      <Btn icon={Italic} cmd="italic" title="Italic" />

      <button
        onMouseDown={(e) => {
          e.preventDefault();
          handleLink();
        }}
        className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-900"
        title="Insert link"
      >
        <LinkIcon size={14} />
      </button>

      <button
        onMouseDown={(e) => {
          e.preventDefault();
          setShowEmoji((x) => !x);
        }}
        className="p-1 hover:bg-slate-200 rounded text-slate-500 hover:text-slate-900"
        title="Insert emoji"
      >
        <Smile size={14} />
      </button>

      {showEmoji && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 shadow-lg rounded-md p-2 grid grid-cols-8 gap-1">
          {EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onMouseDown={(e) => {
                e.preventDefault();
                insertEmoji(emoji);
              }}
              className="text-lg hover:bg-slate-100 rounded"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="w-px h-3 bg-slate-300 mx-1" />

      <Btn icon={List} cmd="insertUnorderedList" title="Bullet list" />
      <Btn icon={ListOrdered} cmd="insertOrderedList" title="Numbered list" />

      <div className="w-px h-3 bg-slate-300 mx-1" />

      <button
        onMouseDown={(e) => {
          e.preventDefault();
          toggleRecording();
        }}
        className={cn(
          "p-1 rounded flex items-center justify-center transition-all",
          micBusy
            ? "bg-red-100 text-red-600 animate-pulse"
            : "hover:bg-slate-200 text-slate-500 hover:text-slate-900"
        )}
        title={
          isRecording
            ? "Stop recording"
            : isSending
            ? "Transcribing..."
            : "Start recording"
        }
      >
        {isSending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : isRecording ? (
          <MicOff size={14} />
        ) : (
          <Mic size={14} />
        )}
      </button>

      <button
        onMouseDown={(e) => {
          e.preventDefault();
          handleAiify();
        }}
        disabled={isAiLoading}
        className={cn(
          "p-1 rounded transition-all",
          isAiLoading
            ? "bg-purple-100 text-purple-400 cursor-wait"
            : "hover:bg-purple-100 text-purple-500 hover:text-purple-700"
        )}
        title="AI polish"
      >
        {isAiLoading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Sparkles size={14} />
        )}
      </button>
    </div>
  );
};