// FILE: src/components/MeetingSpaceView.tsx

import React, { useState } from "react";
import { ArrowLeft, Trash2 } from "lucide-react";
import { MeetingSpace, MeetingRecord } from "@/domain/types";
import { generateId } from "@/domain/utils";
import { processMeetingTranscript } from "@/domain/ai/meetings";
import { MeetingInsightCard } from "@/components/MeetingInsightCard";

interface MeetingSpaceViewProps {
  space: MeetingSpace;
  onUpdateSpace: (space: MeetingSpace) => void;
  onBack: () => void;
}

export const MeetingSpaceView: React.FC<MeetingSpaceViewProps> = ({
  space,
  onUpdateSpace,
  onBack,
}) => {
  /* ---------------- Create state ---------------- */
  const [isAdding, setIsAdding] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState("");

  /* ---------------- Edit state ---------------- */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTranscript, setEditTranscript] = useState("");
  const [editNotes, setEditNotes] = useState("");

  /* ---------------- Create & process record ---------------- */
  const addRecord = async () => {
    if (!title.trim() || !transcript.trim()) return;

    setIsSaving(true);

    try {
      const insight = await processMeetingTranscript({
        transcript,
      });

      const record: MeetingRecord = {
        id: generateId(),
        title: title.trim(),
        date,
        transcript,
        notes,
        insight,
        createdAt: new Date().toISOString(),
      };

      onUpdateSpace({
        ...space,
        records: [record, ...space.records],
      });

      setTitle("");
      setDate(new Date().toISOString().slice(0, 10));
      setTranscript("");
      setNotes("");
      setIsAdding(false);
    } catch (err) {
      console.error("Failed to process meeting", err);
      alert("Something went wrong while saving this meeting.");
    } finally {
      setIsSaving(false);
    }
  };

/* ---------------- Delete record ---------------- */
const deleteRecord = (id: string) => {
    onUpdateSpace({
      ...space,
      records: space.records.filter((r) => r.id !== id),
    });
  };

  /* ---------------- Edit helpers ---------------- */
  const startEdit = (r: MeetingRecord) => {
    if (r.insight) return; // immutable once remembered

    setEditingId(r.id);
    setEditTitle(r.title);
    setEditDate(r.date);
    setEditTranscript(r.transcript);
    setEditNotes(r.notes ?? "");
  };

  const saveEdit = () => {
    if (!editingId) return;

    onUpdateSpace({
        ...space,
        records: space.records.map((r) =>
          r.id === editingId
            ? {
                ...r,
                title: editTitle.trim(),
                date: editDate,
                transcript: editTranscript,
                notes: editNotes,
              }
            : r
        ),
      });

    setEditingId(null);
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* HEADER */}
      <div className="p-6 border-b flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{space.name}</h1>
            <p className="text-xs text-slate-400">
              Persistent Intelligence Space
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-500"
        >
          + New Meeting Entry
        </button>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — TIMELINE */}
        <div className="relative flex-1 overflow-y-auto p-6">
          {/* Vertical timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200" />

          <div className="space-y-8">
            {/* ADD FORM */}
            {isAdding && (
  <div className="ml-12">
<div className="relative rounded-xl border bg-slate-50 p-5">
      {isSaving && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 text-sm text-slate-600">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            <span>Saving & remembering this meeting…</span>
          </div>
        </div>
      )}

      {/* FORM CONTENT */}
      <div className="space-y-4">        {/* HEADER */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700">
            New Meeting
          </h3>
        </div>

        {/* TITLE + DATE */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Meeting title"
            disabled={isSaving}
            className="md:col-span-3 w-full px-4 py-2.5 rounded-lg border text-sm focus:ring-2 focus:ring-indigo-500"
          />

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isSaving}
            className="w-full px-3 py-2.5 rounded-lg border text-sm"
          />
        </div>

        {/* TRANSCRIPT */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            Transcript
          </label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Paste the meeting transcript here…"
            disabled={isSaving}
            className="w-full h-40 px-4 py-3 rounded-lg border text-sm leading-relaxed focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* NOTES */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-400">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything else worth remembering?"
            disabled={isSaving}
            className="w-full h-24 px-4 py-2 rounded-lg border text-sm"
          />
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={addRecord}
            disabled={isSaving}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            Save & Remember
          </button>

          <button
            onClick={() => setIsAdding(false)}
            disabled={isSaving}
            className="rounded-lg border px-4 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
)}


            {space.records.length === 0 && !isAdding && (
              <div className="ml-12 text-sm text-slate-500 italic">
                No meetings yet.
              </div>
            )}

            {/* MEETINGS */}
            {space.records.map((r) => (
              <div
                key={r.id}
                className="relative pl-12 rounded-lg transition-colors hover:bg-slate-50"
              >
                {/* Timeline dot */}
                <div className="absolute left-5 top-7">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ring-4 ring-white ${
                      r.insight ? "bg-indigo-600" : "bg-slate-300"
                    }`}
                  />
                </div>

                <div className="flex justify-between gap-2">
                  <div className="flex-1">
                    {editingId === r.id ? (
                      <div className="space-y-2">
                        <input
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                        <input
                          type="date"
                          value={editDate}
                          onChange={(e) => setEditDate(e.target.value)}
                          className="px-2 py-1 border rounded text-sm"
                        />
                        <textarea
                          value={editTranscript}
                          onChange={(e) =>
                            setEditTranscript(e.target.value)
                          }
                          className="w-full h-24 px-2 py-1 border rounded text-sm"
                        />
                        <textarea
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="w-full h-20 px-2 py-1 border rounded text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={saveEdit}
                            className="px-3 py-1 text-sm rounded bg-blue-600 text-white"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 text-sm rounded border"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="font-medium">{r.title}</div>
                        <div className="text-xs text-slate-400">{r.date}</div>
                      </>
                    )}
                  </div>

                  <div className="flex gap-1">
                    <button
                      onClick={() => startEdit(r)}
                      disabled={!!r.insight}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteRecord(r.id)}
                      className="p-1 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {r.insight && <MeetingInsightCard record={r} />}

                {!editingId && r.transcript && (
                  <details className="text-sm mt-2">
                    <summary className="cursor-pointer text-slate-500">
                      Transcript (raw)
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-600">
                      {r.transcript}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — ANALYST SIDEBAR */}
        <div className="w-96 border-l bg-slate-50 p-4 flex flex-col">
          <h3 className="font-semibold mb-1">Space Analyst</h3>
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-4">
            Cross-meeting intelligence
          </p>

          <div className="flex-1 text-sm text-slate-500 italic">
            Ask questions once meetings are remembered.
          </div>
        </div>
      </div>
    </div>
  );
};