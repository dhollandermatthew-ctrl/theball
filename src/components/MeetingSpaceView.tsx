  import React, { useState } from "react";
  import { ArrowLeft, Trash2, Plus } from "lucide-react";
  import { MeetingSpace, MeetingRecord } from "@/domain/types";
  import { generateId, cn } from "@/domain/utils";
  import { processMeetingTranscript } from "@/domain/ai/meetings";
  import { MeetingInsightCard } from "@/components/MeetingInsightCard";
  import { WysiwygEditor } from "@/components/WysiwygEditor";

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
    /* ---------------- State ---------------- */
    const [activeTab, setActiveTab] = useState<"meetings" | "notes">("meetings");
    const [isAddingMeeting, setIsAddingMeeting] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [title, setTitle] = useState("");
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [transcript, setTranscript] = useState("");
    const [notes, setNotes] = useState("");

      /* ---------------- Space Notes Pages ---------------- */
      const pages = Array.isArray(space.spaceNotes) ? space.spaceNotes : [];

      // Ensure there is always a default "Notes 1" page
      React.useEffect(() => {
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
      
      const [activePageId, setActivePageId] = useState<string | null>(null);
      
      React.useEffect(() => {
        if (pages.length > 0 && !activePageId) {
          setActivePageId(pages[0].id);
        }
      }, [pages, activePageId]);
            

    const activePage =
      pages.find((p) => p.id === activePageId) ?? pages[0];

    /* ---------------- Create meeting ---------------- */
    const addRecord = async () => {
      if (!title.trim() || !transcript.trim()) return;

      setIsSaving(true);
      try {
        const insight = await processMeetingTranscript({ transcript });

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
        setTranscript("");
        setNotes("");
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
              <h1 className="text-2xl font-bold">{space.name}</h1>
              <p className="text-xs text-slate-400">
                Persistent Intelligence Space
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setActiveTab("meetings")}
                className={cn(
                  "px-4 py-2 text-sm font-bold rounded-lg transition-all",
                  activeTab === "meetings"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Meetings
              </button>
              <button
                onClick={() => setActiveTab("notes")}
                className={cn(
                  "px-4 py-2 text-sm font-bold rounded-lg transition-all",
                  activeTab === "notes"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                )}
              >
                Space Notes
              </button>
            </div>

            {/* Primary action */}
            {activeTab === "meetings" && (
              <button
                onClick={() => setIsAddingMeeting(true)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-500"
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
              <div className="relative">
                <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-200" />

                <div className="space-y-8">
                  {/* Add meeting */}
                  {isAddingMeeting && (
                    <div className="ml-12 rounded-xl border bg-slate-50 p-5 relative">
                      {isSaving && (
                        <div className="absolute inset-0 bg-white/70 flex items-center justify-center rounded-xl">
                          <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full" />
                        </div>
                      )}

                      <div className="space-y-4">
                        <input
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Meeting title"
                          className="w-full px-4 py-2.5 rounded-lg border text-sm"
                        />

                        <input
                          type="date"
                          value={date}
                          onChange={(e) => setDate(e.target.value)}
                          className="w-48 px-3 py-2.5 rounded-lg border text-sm"
                        />

                        <textarea
                          value={transcript}
                          onChange={(e) => setTranscript(e.target.value)}
                          placeholder="Paste the meeting transcript…"
                          className="w-full h-40 px-4 py-3 rounded-lg border text-sm"
                        />

                        <textarea
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Optional notes"
                          className="w-full h-24 px-4 py-2 rounded-lg border text-sm"
                        />

                        <div className="flex gap-3">
                          <button
                            onClick={addRecord}
                            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold"
                          >
                            Save & Remember
                          </button>
                          <button
                            onClick={() => setIsAddingMeeting(false)}
                            className="border px-4 py-2.5 rounded-lg text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  {space.records.map((r) => (
                    <div key={r.id} className="relative pl-12">
                      <div className="absolute left-5 top-7 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />

                      <div className="flex justify-between">
                        <div>
                          <div className="font-medium">{r.title}</div>
                          <div className="text-xs text-slate-400">{r.date}</div>
                        </div>
                        <button
                          onClick={() => deleteRecord(r.id)}
                          className="p-1 text-slate-400 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* COLLAPSED TRANSCRIPT */}

  {r.insight && <MeetingInsightCard record={r} />}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* -------- SPACE NOTES -------- */
              <div className="max-w-4xl mx-auto h-full">
                <div className="h-full bg-white rounded-3xl border shadow-xl flex flex-col">
             {/* ---------- Space Notes Header ---------- */}
<div className="p-4 border-b bg-slate-50 flex items-center justify-between">
  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">
    Space Notes
  </span>

  <button
    onClick={() => {
      const newPage = {
        id: generateId(),
        title: `Notes ${pages.length + 1}`,
        content: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      onUpdateSpace({
        ...space,
        spaceNotes: [...pages, newPage],
      });

      setActivePageId(newPage.id);
    }}
    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
  >
    + New Page
  </button>
</div>

{/* ---------- Page Tabs ---------- */}
<div className="flex gap-1 px-4 py-2 border-b bg-white overflow-x-auto">
  {pages.map((page, index) => (
    <div
      key={page.id}
      className={cn(
        "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap",
        page.id === activePage?.id
          ? "bg-indigo-600 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      )}
    >
      <button onClick={() => setActivePageId(page.id)}>
        {page.title || `Page ${index + 1}`}
      </button>

      {index !== 0 && (
  <button
    onClick={() => {
      const remaining = pages.filter((p) => p.id !== page.id);

      onUpdateSpace({
        ...space,
        spaceNotes: remaining,
      });

      if (activePage?.id === page.id) {
        setActivePageId(remaining[0]?.id ?? null);
      }
    }}
    className="ml-1 text-white/70 hover:text-white"
    title="Delete page"
  >
    ×
  </button>
)}
    </div>
  ))}
</div>

{/* ---------- Editor ---------- */}
<WysiwygEditor
  key={activePage?.id}   // 🔑 REQUIRED
  initialContent={activePage?.content ?? ""}
  placeholder="Write anything worth remembering across meetings…"
  onChange={(html: string) =>
    onUpdateSpace({
      ...space,
      spaceNotes: pages.map((p) =>
        p.id === activePage?.id
          ? { ...p, content: html, updatedAt: new Date().toISOString() }
          : p
      ),
    })
  }
  onBlur={() => {}}
/>
                </div>
              </div>
            )}
          </div>

          {/* -------- SIDEBAR -------- */}
          <div className="w-96 border-l bg-slate-50 p-4">
            <h3 className="font-semibold mb-1">Space Analyst</h3>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-4">
              Cross-meeting intelligence
            </p>
            <div className="italic text-sm text-slate-500">
              Ask questions once meetings are remembered.
            </div>
          </div>
        </div>
      </div>
    );
  };