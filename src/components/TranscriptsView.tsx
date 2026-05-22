// FILE: src/components/TranscriptsView.tsx
import React, { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Mic, MicOff, Trash2, Clock, Users, Copy, Download, Check } from "lucide-react";
import { writeTextFile, BaseDirectory } from "@tauri-apps/plugin-fs";

import { useAppStore } from "@/domain/state";
import {
  startRecording,
  stopRecording,
  subscribeSession,
  getSessionState,
  clearPendingRecordId,
} from "@/domain/recordingSession";
import type { SpeakerUtterance, TranscriptRecord } from "@/domain/types";
import { cn } from "@/domain/utils";

// Hook: subscribes to the module-level recording session
function useSession() {
  const [, rerender] = useReducer((x) => x + 1, 0);
  useEffect(() => subscribeSession(rerender), []);
  return getSessionState();
}

// -------------------------------------------------------
// Speaker colour palette (A→E)
// -------------------------------------------------------
const SPEAKER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: "bg-blue-50",   text: "text-blue-800",   border: "border-blue-200" },
  B: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
  C: { bg: "bg-amber-50",  text: "text-amber-800",  border: "border-amber-200" },
  D: { bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" },
  E: { bg: "bg-rose-50",   text: "text-rose-800",   border: "border-rose-200" },
};

function speakerColor(speaker: string) {
  return SPEAKER_COLORS[speaker] ?? { bg: "bg-slate-50", text: "text-slate-700", border: "border-slate-200" };
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toMarkdown(record: TranscriptRecord): string {
  const date = formatDate(record.createdAt);
  const lines: string[] = [`# ${record.title}`, ``, `**Date:** ${date}`, ``, `---`, ``];

  if (record.utterances.length > 0) {
    for (const u of record.utterances) {
      const name = record.speakerNames?.[u.speaker] ?? `Speaker ${u.speaker}`;
      lines.push(`**${name}:** ${u.text}`, ``);
    }
  } else {
    lines.push(record.rawTranscript);
  }

  return lines.join("\n");
}

function toPlainText(record: TranscriptRecord): string {
  if (record.utterances.length > 0) {
    return record.utterances
      .map((u) => {
        const name = record.speakerNames?.[u.speaker] ?? `Speaker ${u.speaker}`;
        return `${name}: ${u.text}`;
      })
      .join("\n\n");
  }
  return record.rawTranscript;
}

// -------------------------------------------------------
// Inline speaker name editor with autocomplete
// -------------------------------------------------------
const SpeakerNameEditor: React.FC<{
  speaker: string;
  currentName: string | undefined;
  knownNames: string[];
  onSave: (name: string) => void;
  colorClass: string;
}> = ({ speaker, currentName, knownNames, onSave, colorClass }) => {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");

  const filtered = input.length > 0
    ? knownNames.filter((n) => n.toLowerCase().startsWith(input.toLowerCase()) && n.toLowerCase() !== input.toLowerCase())
    : knownNames;

  const commit = (value: string) => {
    const trimmed = value.trim();
    if (trimmed) onSave(trimmed);
    setEditing(false);
  };

  if (!editing) {
    return (
      <button
        onClick={() => { setInput(currentName ?? ""); setEditing(true); }}
        className={cn("text-xs font-semibold hover:opacity-70 transition-opacity cursor-pointer", colorClass)}
        title="Click to name this speaker"
      >
        {currentName ?? `Speaker ${speaker}`}
      </button>
    );
  }

  return (
    <div className="relative">
      <input
        autoFocus
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit(input);
          if (e.key === "Escape") setEditing(false);
        }}
        onBlur={() => setTimeout(() => commit(input), 120)}
        className={cn("text-xs font-semibold bg-white border border-blue-400 rounded px-1.5 outline-none w-32", colorClass)}
        placeholder={`Speaker ${speaker}`}
      />
      {filtered.length > 0 && (
        <div className="absolute top-full left-0 z-50 mt-0.5 bg-white border border-slate-200 rounded-md shadow-lg min-w-[8rem]">
          {filtered.slice(0, 6).map((name) => (
            <button
              key={name}
              onMouseDown={(e) => { e.preventDefault(); commit(name); }}
              className="block w-full text-left px-2 py-1.5 text-xs text-slate-700 hover:bg-slate-50 first:rounded-t-md last:rounded-b-md"
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------
// Utterance block
// -------------------------------------------------------
const UtteranceBlock: React.FC<{
  utterance: SpeakerUtterance;
  speakerNames?: Record<string, string>;
  knownNames?: string[];
  onNameChange?: (speaker: string, name: string) => void;
}> = ({ utterance, speakerNames, knownNames = [], onNameChange }) => {
  const colors = speakerColor(utterance.speaker);
  return (
    <div className={cn("rounded-lg border p-3 mb-2", colors.bg, colors.border)}>
      <div className="mb-1">
        {onNameChange ? (
          <SpeakerNameEditor
            speaker={utterance.speaker}
            currentName={speakerNames?.[utterance.speaker]}
            knownNames={knownNames}
            onSave={(name) => onNameChange(utterance.speaker, name)}
            colorClass={colors.text}
          />
        ) : (
          <span className={cn("text-xs font-semibold", colors.text)}>
            {speakerNames?.[utterance.speaker] ?? `Speaker ${utterance.speaker}`}
          </span>
        )}
      </div>
      <p className="text-sm text-slate-800 leading-relaxed">{utterance.text}</p>
    </div>
  );
};

// -------------------------------------------------------
// Left panel — transcript list item
// -------------------------------------------------------
const TranscriptListItem: React.FC<{
  record: TranscriptRecord;
  isActive: boolean;
  onClick: () => void;
}> = ({ record, isActive, onClick }) => {
  const speakerCount = new Set(record.utterances.map((u) => u.speaker)).size;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-3 rounded-lg border transition-colors mb-1",
        isActive
          ? "bg-white border-slate-300 shadow-sm"
          : "bg-transparent border-transparent hover:bg-white hover:border-slate-200"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-slate-800 truncate">{record.title || "Untitled"}</p>
        {record.status === "processing" && (
          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
        )}
      </div>
      <div className="flex items-center gap-3 mt-1">
        <span className="text-xs text-slate-400">{formatDate(record.createdAt)}</span>
        {speakerCount > 0 && (
          <span className="flex items-center gap-1 text-xs text-slate-400">
            <Users size={11} />
            {speakerCount}
          </span>
        )}
      </div>
    </button>
  );
};

// -------------------------------------------------------
// Main component
// -------------------------------------------------------
type Mode = "idle" | "viewing";

export const TranscriptsView: React.FC = () => {
  const session = useSession();
  const transcripts = useAppStore((s) => s.transcripts);
  const people = useAppStore((s) => s.people);
  const updateTranscript = useAppStore((s) => s.updateTranscript);
  const deleteTranscript = useAppStore((s) => s.deleteTranscript);

  const knownNames = useMemo(() => {
    const names = new Set<string>();
    people.forEach((p) => names.add(p.name));
    transcripts.forEach((t) => {
      Object.values(t.speakerNames ?? {}).forEach((n) => names.add(n));
    });
    return [...names].sort();
  }, [people, transcripts]);

  const [mode, setMode] = useState<Mode>("idle");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [exported, setExported] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordingMode, setRecordingMode] = useState<"room" | "call">("room");

  const liveBottomRef = useRef<HTMLDivElement>(null);

  // Elapsed timer — re-renders every second while recording
  const [, tick] = useReducer((x) => x + 1, 0);
  useEffect(() => {
    if (!session.isActive) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [session.isActive]);
  const elapsedSeconds = session.isActive
    ? Math.floor((Date.now() - session.startedAt) / 1000)
    : 0;

  // Navigate to new transcript when recording stops
  useEffect(() => {
    if (session.pendingRecordId) {
      setSelectedId(session.pendingRecordId);
      setMode("viewing");
      clearPendingRecordId();
    }
  }, [session.pendingRecordId]);

  // Auto-scroll live transcript
  useEffect(() => {
    liveBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.segments.length, session.interimText]);

  const sorted = [...transcripts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const selectedRecord = transcripts.find((r) => r.id === selectedId) ?? null;

  // ---- Recording ----

  const handleStartRecording = async () => {
    setError(null);
    try {
      await startRecording(recordingMode);
    } catch {
      setError("Microphone access denied. Check system permissions.");
    }
  };

  // ---- Speaker name assignment ----

  const handleViewingNameChange = (speaker: string, name: string) => {
    if (!selectedRecord) return;
    const updated = { ...(selectedRecord.speakerNames ?? {}), [speaker]: name };
    updateTranscript(selectedRecord.id, { speakerNames: updated });
  };

  // ---- Copy to clipboard ----

  const handleCopy = async (record: TranscriptRecord) => {
    await navigator.clipboard.writeText(toPlainText(record));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ---- Export as Markdown to ~/Downloads ----

  const handleExport = async (record: TranscriptRecord) => {
    const safe = record.title.replace(/[^a-zA-Z0-9\s-]/g, "").trim().replace(/\s+/g, "-") || "transcript";
    const filename = `${safe}-${record.date}.md`;
    try {
      await writeTextFile(filename, toMarkdown(record), { baseDir: BaseDirectory.Download });
      setExported(true);
      setTimeout(() => setExported(false), 2500);
    } catch (err: any) {
      alert(`Export failed: ${err.message ?? err}`);
    }
  };

  // ---- Delete ----

  const handleDelete = (id: string) => {
    deleteTranscript(id);
    if (selectedId === id) {
      setSelectedId(null);
      setMode("idle");
    }
  };

  // ---- Inline title update ----

  const handleTitleBlur = (id: string, value: string) => {
    const trimmed = value.trim();
    if (trimmed) updateTranscript(id, { title: trimmed });
  };

  // -------------------------------------------------------
  // Right panel rendering
  // -------------------------------------------------------

  const renderRightPanel = () => {
    // --- RECORDING — live captions ---
    if (session.isActive) {
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-6 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-mono font-semibold text-slate-700">
                {formatDuration(elapsedSeconds)}
              </span>
              <span className="text-xs text-slate-400">
                {session.mode === "call" ? "Call recording…" : "Recording…"}
              </span>
            </div>
            <button
              onClick={stopRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
            >
              <MicOff size={13} /> Stop
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {session.segments.length === 0 && !session.interimText && (
              <p className="text-sm text-slate-300 italic">Listening…</p>
            )}
            {session.segments.map((seg, i) => (
              <p key={i} className="text-sm text-slate-800 leading-relaxed mb-2">{seg}</p>
            ))}
            {session.interimText && (
              <p className="text-sm text-slate-400 italic">{session.interimText}</p>
            )}
            <div ref={liveBottomRef} />
          </div>
        </div>
      );
    }

    // --- VIEWING saved transcript ---
    if (mode === "viewing" && selectedRecord) {
      const speakers = [...new Set(selectedRecord.utterances.map((u) => u.speaker))];
      return (
        <div className="flex flex-col h-full">
          <div className="flex items-start justify-between px-6 py-4 border-b border-slate-100">
            <div className="flex-1 min-w-0">
              <input
                type="text"
                defaultValue={selectedRecord.title}
                onBlur={(e) => handleTitleBlur(selectedRecord.id, e.target.value)}
                className="w-full text-lg font-semibold text-slate-800 bg-transparent border-none outline-none"
              />
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs text-slate-400">
                  {formatDate(selectedRecord.createdAt)}
                </span>
                {speakers.length > 0 && (
                  <div className="flex items-center gap-1">
                    {speakers.map((s) => {
                      const c = speakerColor(s);
                      const name = selectedRecord.speakerNames?.[s] ?? s;
                      return (
                        <span key={s} className={cn("inline-block px-1.5 py-0.5 rounded text-xs font-medium", c.bg, c.text)}>
                          {name}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => handleDelete(selectedRecord.id)}
              className="ml-4 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Processing banner */}
          {selectedRecord.status === "processing" && (
            <div className="flex items-center gap-2 px-6 py-2 bg-amber-50 border-b border-amber-100">
              <div className="w-3 h-3 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
              <span className="text-xs text-amber-700">Identifying speakers… this may take a minute</span>
            </div>
          )}

          {/* Action bar */}
          <div className="flex items-center gap-2 px-6 py-2 border-b border-slate-100">
            <button
              onClick={() => handleCopy(selectedRecord)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
              {copied ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={() => handleExport(selectedRecord)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {exported ? <Check size={13} className="text-green-500" /> : <Download size={13} />}
              {exported ? "Saved to Downloads!" : "Export .md"}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {selectedRecord.utterances.length > 0 ? (
              selectedRecord.utterances.map((u, i) => (
                <UtteranceBlock
                  key={i}
                  utterance={u}
                  speakerNames={selectedRecord.speakerNames}
                  knownNames={knownNames}
                  onNameChange={handleViewingNameChange}
                />
              ))
            ) : (
              <p className="text-sm text-slate-500 whitespace-pre-wrap leading-relaxed">
                {selectedRecord.rawTranscript}
              </p>
            )}
          </div>
        </div>
      );
    }

    // --- IDLE ---
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
        <Mic size={40} className="text-slate-200" />
        <p className="text-sm">Start a new recording or select one from the list</p>
      </div>
    );
  };

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------
  return (
    <div className="flex h-full overflow-hidden">
      {/* Left panel — list */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-slate-100 bg-slate-50/50 overflow-hidden">
        <div className="px-4 py-4 border-b border-slate-100 space-y-2">
          {/* Recording mode toggle */}
          <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
            <button
              onClick={() => setRecordingMode("room")}
              className={cn(
                "flex-1 py-1.5 transition-colors",
                recordingMode === "room" ? "bg-slate-800 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
              )}
            >
              Room
            </button>
            <button
              onClick={() => setRecordingMode("call")}
              className={cn(
                "flex-1 py-1.5 transition-colors border-l border-slate-200",
                recordingMode === "call" ? "bg-slate-800 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
              )}
            >
              Call
            </button>
          </div>
          <p className="text-xs text-slate-400">
            {recordingMode === "room"
              ? "Mic only — for in-person meetings"
              : "System audio + mic — captures both sides of a call"}
          </p>

          <button
            onClick={() => {
              setSelectedId(null);
              setError(null);
              handleStartRecording();
            }}
            disabled={session.isActive}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors",
              session.isActive
                ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            )}
          >
            <Mic size={15} />
            New Recording
          </button>
        </div>

        {error && (
          <div className="mx-3 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 py-3">
          {sorted.length === 0 ? (
            <p className="text-xs text-slate-400 text-center mt-8 px-4">
              No transcripts yet. Press "New Recording" to start.
            </p>
          ) : (
            sorted.map((r) => (
              <TranscriptListItem
                key={r.id}
                record={r}
                isActive={selectedId === r.id && mode === "viewing"}
                onClick={() => {
                  if (session.isActive) return;
                  setSelectedId(r.id);
                  setMode("viewing");
                }}
              />
            ))
          )}
        </div>

        {sorted.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock size={11} />
              {sorted.length} transcript{sorted.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="flex-1 min-w-0 bg-white overflow-hidden">
        {renderRightPanel()}
      </div>
    </div>
  );
};
