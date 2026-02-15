import React, { useState, useEffect, useRef, useMemo } from "react";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { MeetingSpace, MeetingRecord } from "@/domain/types";
import { generateId, cn } from "@/domain/utils";
import { processMeetingTranscript } from "@/domain/ai/meetings";
import { MeetingInsightCard } from "@/components/MeetingInsightCard";
import { WysiwygEditor } from "@/components/WysiwygEditor";
import { executeSpaceAgent } from "@/domain/ai/spaceAgent";
import { suggestSpaceQuestions } from "@/domain/ai/suggestSpaceQuestions";
import type { SpaceAgentResponse } from "@/domain/ai/spaceAgent";


interface MeetingSpaceViewProps {
  space: MeetingSpace;
  onUpdateSpace: (space: MeetingSpace) => void;
  onBack: () => void;
}

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  meta?: {
    confidence?: string;
    basedOn?: SpaceAgentResponse["basedOn"];
  };
};

export const MeetingSpaceView: React.FC<MeetingSpaceViewProps> = ({
  space,
  onUpdateSpace,
  onBack,
}) => {
  /* ---------------- Core State ---------------- */
  const [activeTab, setActiveTab] = useState<"meetings" | "notes">("meetings");
  const [isAddingMeeting, setIsAddingMeeting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [transcript, setTranscript] = useState("");
  const [notes, setNotes] = useState("");
  const [meetingType, setMeetingType] = useState<"normal" | "discovery">("normal");

  /* ---------------- Filter State ---------------- */
  const [meetingFilter, setMeetingFilter] = useState<"all" | "normal" | "discovery">("all");

  /* ---------------- Space Notes Pages ---------------- */
  const pages = Array.isArray(space.spaceNotes) ? space.spaceNotes : [];
  const [activePageId, setActivePageId] = useState<string | null>(null);

  useEffect(() => {
    if (pages.length === 0) {
      const firstPage = {
        id: generateId(),
        title: "Notes 1",
        content: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onUpdateSpace({
        ...space,
        spaceNotes: [firstPage],
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pages.length]);

  useEffect(() => {
    if (pages.length > 0 && !activePageId) {
      setActivePageId(pages[0].id);
    }
  }, [pages, activePageId]);

  const activePage = pages.find((p) => p.id === activePageId) ?? pages[0];

  /* ---------------- Space Agent State ---------------- */
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const hasContext =
    space.records.length > 0 &&
    space.records.some((r) => r.transcript?.trim());

  const chatScrollRef = useRef<HTMLDivElement>(null);

  /* ---------------- Aggregated participants ---------------- */
  const aggregatedParticipants = useMemo(() => {
    const counts = new Map<string, number>();

    for (const record of space.records) {
      const raw = record.insight?.participants ?? [];
      if (!raw || raw.length === 0) continue;

      const uniqueNames = Array.from(
        new Set(
          raw
            .map((name) => name.trim())
            .filter((name) => name.length > 0),
        ),
      );

      for (const name of uniqueNames) {
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort(
        (a, b) =>
          b.count - a.count || a.name.localeCompare(b.name),
      );
  }, [space.records]);

  /* ---------------- Filtered records ---------------- */
  const filteredRecords = useMemo(() => {
    if (meetingFilter === "all") {
      return space.records;
    }
    return space.records.filter(
      (r) => (r.meetingType || "normal") === meetingFilter
    );
  }, [space.records, meetingFilter]);

  useEffect(() => {
    if (!hasContext) {
      setSuggestedQuestions([]);
      setIsLoadingSuggestions(false);
      return;
    }
  
    setIsLoadingSuggestions(true);
  
    suggestSpaceQuestions(space)
      .then((qs) => setSuggestedQuestions(qs))
      .finally(() => setIsLoadingSuggestions(false));
  }, [space.records, hasContext]);

  useEffect(() => {
    chatScrollRef.current?.scrollTo({
      top: chatScrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const askSpaceAgent = async () => {
    if (!question.trim() || !hasContext) return;

    const userQuestion = question;
    setQuestion("");
    setIsAsking(true);

    setMessages((m) => [
      ...m,
      { role: "user", content: userQuestion },
    ]);

    try {
      const response = await executeSpaceAgent({
        space,
        question: userQuestion,
      });

      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: response.answer,
          meta: {
            confidence: response.confidence,
            basedOn: response.basedOn,
          },
        },
      ]);

      setSuggestedQuestions([]);
    } finally {
      setIsAsking(false);
    }
  };

  /* ---------------- Create Meeting ---------------- */
  const addRecord = async () => {
    if (!title.trim() || !transcript.trim()) return;

    setIsSaving(true);
    try {
      const insight = await processMeetingTranscript({ 
        transcript,
        meetingType 
      });

      const record: MeetingRecord = {
        id: generateId(),
        title: title.trim(),
        date,
        transcript,
        notes,
        meetingType,
        insight,
        createdAt: new Date().toISOString(),
      };

      onUpdateSpace({
        ...space,
        records: [record, ...space.records],
      });

      setTitle("");
      setTranscript("");
      setNotes("");
      setMeetingType("normal");
      setIsAddingMeeting(false);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteRecord = (id: string) => {
    onUpdateSpace({
      ...space,
      records: space.records.filter((r) => r.id !== id),
    });
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* ================= HEADER ================= */}
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded hover:bg-slate-100">
            <ArrowLeft size={18} />
          </button>

          <div>
            <input
              value={space.name}
              onChange={(e) =>
                onUpdateSpace({ ...space, name: e.target.value })
              }
              className="text-2xl font-bold bg-transparent focus:outline-none border-none p-0 w-full"
            />
            {aggregatedParticipants.length > 0 && (
              <p className="mt-1 text-xs text-slate-400">
                People in this space:{" "}
                {aggregatedParticipants
                  .map((p) =>
                    p.count > 1 ? `${p.name} (${p.count})` : p.name,
                  )
                  .join(", ")}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("meetings")}
              className={cn(
                "px-4 py-2 text-sm font-bold rounded-lg",
                activeTab === "meetings"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500"
              )}
            >
              Meetings
            </button>
            <button
              onClick={() => setActiveTab("notes")}
              className={cn(
                "px-4 py-2 text-sm font-bold rounded-lg",
                activeTab === "notes"
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-500"
              )}
            >
              Space Notes
            </button>
          </div>

          {activeTab === "meetings" && (
            <button
              onClick={() => setIsAddingMeeting(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
            >
              <Plus size={16} /> New Meeting
            </button>
          )}
        </div>
      </div>

      {/* ================= BODY ================= */}
      <div className="flex flex-1 overflow-hidden">
        {/* -------- MAIN COLUMN -------- */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === "meetings" ? (
            <div className="space-y-8 max-w-4xl mx-auto">
              {isAddingMeeting && (
                <div className="rounded-2xl border bg-white shadow-sm">
                  {/* Header */}
                  <div className="px-6 py-4 border-b">
                    <h2 className="text-lg font-semibold">New Meeting</h2>
                    <p className="text-sm text-slate-500">
                      Add a transcript to generate insights and activate space
                      intelligence.
                    </p>
                  </div>

                  {/* Content */}
                  <div className="px-6 py-5 space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        MEETING TITLE
                      </label>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Architecture Review, Client Sync"
                        className="
                          w-full rounded-lg border px-3 py-2 text-sm
                          focus:outline-none focus:ring-2 focus:ring-indigo-500
                        "
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          MEETING DATE
                        </label>
                        <input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="
                            w-full rounded-lg border px-3 py-2 text-sm
                            focus:outline-none focus:ring-2 focus:ring-indigo-500
                          "
                        />
                        <p className="mt-1 text-[11px] text-slate-400">
                          When this conversation actually happened.
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          MEETING TYPE
                        </label>
                        <div className="flex gap-2 w-full">
                          <button
                            type="button"
                            onClick={() => setMeetingType("normal")}
                            className={cn(
                              "flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all",
                              meetingType === "normal"
                                ? "bg-indigo-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            )}
                          >
                            Normal Call
                          </button>
                          <button
                            type="button"
                            onClick={() => setMeetingType("discovery")}
                            className={cn(
                              "flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all",
                              meetingType === "discovery"
                                ? "bg-purple-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            )}
                          >
                            Discovery Call
                          </button>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-400">
                          {meetingType === "discovery" 
                            ? "Extracts feature requests and problem signals."
                            : "Tracks follow-ups and open questions."}
                        </p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        TRANSCRIPT
                      </label>
                      <textarea
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        placeholder="Paste the full meeting transcript here…"
                        className="
                          w-full h-56 rounded-lg border px-3 py-2 text-sm
                          focus:outline-none focus:ring-2 focus:ring-indigo-500
                        "
                      />
                      <p className="mt-1 text-xs text-slate-400">
                        This will be analyzed to extract decisions, themes, and
                        follow-ups.
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-2">
                    <button
                      onClick={() => setIsAddingMeeting(false)}
                      className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-200"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={addRecord}
                      disabled={
                        isSaving || !title.trim() || !transcript.trim()
                      }
                      className="
                        px-5 py-2 rounded-lg text-sm font-semibold text-white
                        bg-indigo-600 hover:bg-indigo-700
                        disabled:opacity-40 disabled:cursor-not-allowed
                      "
                    >
                      {isSaving ? "Saving…" : "Save Meeting"}
                    </button>
                  </div>
                </div>
              )}

              {/* Filter Bar */}
              {!isAddingMeeting && space.records.length > 0 && (
                <div className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Filter:</span>
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                      <button
                        onClick={() => setMeetingFilter("all")}
                        className={cn(
                          "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                          meetingFilter === "all"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setMeetingFilter("normal")}
                        className={cn(
                          "px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                          meetingFilter === "normal"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        Normal
                      </button>
                      <button
                        onClick={() => setMeetingFilter("discovery")}
                        className={cn(
                          "px-3 py-1.5 text-xs font-semibold rounded-md transition-all whitespace-nowrap",
                          meetingFilter === "discovery"
                            ? "bg-white text-slate-900 shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        Discovery
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500">
                    {filteredRecords.length} {filteredRecords.length === 1 ? 'meeting' : 'meetings'}
                  </div>
                </div>
              )}

              {filteredRecords.length > 0 && (
                <div className="space-y-3">
                  {filteredRecords.map((r) => (
                    <div key={r.id}>
                      <MeetingInsightCard record={r} />
                    </div>
                  ))}
                </div>
              )}

              {filteredRecords.length === 0 && space.records.length > 0 && (
                <div className="text-center py-12 text-slate-500">
                  <p className="text-sm">No {meetingFilter} meetings found.</p>
                  <button
                    onClick={() => setMeetingFilter("all")}
                    className="mt-2 text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                  >
                    Show all meetings
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto h-full">
              <WysiwygEditor
                key={activePage?.id}
                initialContent={activePage?.content ?? ""}
                placeholder="Write anything worth remembering…"
                onChange={(html) =>
                  onUpdateSpace({
                    ...space,
                    spaceNotes: pages.map((p) =>
                      p.id === activePage?.id
                        ? {
                            ...p,
                            content: html,
                            updatedAt: new Date().toISOString(),
                          }
                        : p
                    ),
                  })
                }
                onBlur={() => {}}
              />
            </div>
          )}
        </div>

        {/* -------- SPACE ANALYST (CHAT) -------- */}
        <div className="w-96 border-l bg-slate-50 flex flex-col">
          <div className="p-4 border-b">
            <h3 className="font-semibold mb-1">Space Analyst</h3>
            <p className="text-xs text-slate-400 uppercase tracking-wide">
              Cross-meeting intelligence
            </p>
          </div>

          {!hasContext ? (
            <div className="p-4 text-sm text-slate-500 italic">
              Add meetings with transcripts to activate space intelligence.
            </div>
          ) : (
            <>
              {/* Chat history */}
              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3"
              >
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={cn(
                      "rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap max-w-[85%]",
                      m.role === "user"
                        ? "bg-indigo-100 text-indigo-900 ml-auto"
                        : "bg-white border shadow-sm"
                    )}
                  >
                    {m.content}

                    {m.role === "assistant" && m.meta && (
                      <div className="mt-2 text-xs text-slate-500">
                        Confidence: <b>{m.meta.confidence}</b>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="border-t p-4 space-y-2 bg-white sticky bottom-0">
              {isLoadingSuggestions && (
  <div className="flex flex-wrap gap-2 animate-pulse">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="h-7 w-28 rounded-full bg-slate-200"
      />
    ))}
  </div>
)}

{!isLoadingSuggestions && suggestedQuestions.length > 0 && (
  <div className="flex flex-wrap gap-2">
    {suggestedQuestions.map((q, i) => (
      <button
        key={i}
        onClick={() => setQuestion(q)}
        className="
          px-3 py-1.5
          text-xs font-medium
          bg-white border rounded-full
          text-slate-700
          hover:bg-indigo-50 hover:border-indigo-300
          transition
        "
      >
        {q}
      </button>
    ))}
  </div>
)}

                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask about decisions, patterns, or open questions…"
                  className="w-full h-24 px-3 py-2 rounded-lg border text-sm"
                  disabled={isAsking}
                />

<button
  onClick={askSpaceAgent}
  disabled={isAsking || !question.trim()}
  className="
    w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-semibold
    disabled:opacity-40 disabled:cursor-not-allowed
  "
>
  {isAsking ? "Thinking…" : "Ask Space"}
</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
