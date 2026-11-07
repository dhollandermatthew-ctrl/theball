import React, { useState, useRef } from "react";
import { useAppStore } from "@/domain/state";
import { TalkTrack, TalkTrackSlide } from "@/domain/types";
import { generateId } from "@/domain/utils";
import { Plus, Trash2, ChevronRight, X, GripVertical, Sparkles } from "lucide-react";
import { cn } from "@/domain/utils";
import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;

function SlideCard({
  slide,
  index,
  onUpdate,
  onDelete,
}: {
  slide: TalkTrackSlide;
  index: number;
  onUpdate: (updates: Partial<TalkTrackSlide>) => void;
  onDelete: () => void;
}) {
  const [bulletDraft, setBulletDraft] = useState("");

  function addBullet() {
    const trimmed = bulletDraft.trim();
    if (!trimmed) return;
    onUpdate({ bullets: [...slide.bullets, trimmed] });
    setBulletDraft("");
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
        <GripVertical size={14} className="text-slate-300 cursor-grab" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide flex-shrink-0">
          Slide {index + 1}
        </span>
        <input
          value={slide.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          className="flex-1 text-sm font-medium text-slate-800 bg-transparent outline-none border-b border-transparent focus:border-slate-300"
          placeholder="Slide title…"
        />
        <button onClick={onDelete} className="text-slate-300 hover:text-red-400 transition-colors ml-1">
          <X size={13} />
        </button>
      </div>

      <div className="p-4 space-y-1.5">
        {slide.bullets.map((bullet, i) => (
          <div key={i} className="flex items-start gap-2 group">
            <span className="text-slate-300 mt-0.5 text-xs font-bold flex-shrink-0">·</span>
            <input
              value={bullet}
              onChange={(e) => {
                const updated = [...slide.bullets];
                updated[i] = e.target.value;
                onUpdate({ bullets: updated });
              }}
              className="flex-1 text-sm text-slate-700 bg-transparent outline-none border-b border-transparent focus:border-slate-300"
            />
            <button
              onClick={() => onUpdate({ bullets: slide.bullets.filter((_, idx) => idx !== i) })}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-200 hover:text-red-400"
            >
              <X size={11} />
            </button>
          </div>
        ))}
        <div className="flex gap-1.5 pt-1">
          <span className="text-slate-200 text-xs font-bold mt-1 flex-shrink-0">·</span>
          <input
            value={bulletDraft}
            onChange={(e) => setBulletDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addBullet(); } }}
            placeholder="Add bullet…"
            className="flex-1 text-sm bg-transparent outline-none border-b border-slate-200 focus:border-slate-400 placeholder:text-slate-300 text-slate-700"
          />
          <button onClick={addBullet} className="text-xs text-slate-400 hover:text-slate-700 px-1">+</button>
        </div>
      </div>

      <div className="px-4 pb-3">
        <textarea
          value={slide.speakerNotes ?? ""}
          onChange={(e) => onUpdate({ speakerNotes: e.target.value || undefined })}
          placeholder="Speaker notes…"
          rows={2}
          className="w-full text-xs text-slate-500 italic bg-slate-50 rounded p-2 outline-none focus:ring-1 focus:ring-slate-200 resize-none placeholder:text-slate-300 leading-relaxed"
        />
      </div>
    </div>
  );
}

function TrackDetail({ track }: { track: TalkTrack }) {
  const updateTalkTrack = useAppStore((s) => s.updateTalkTrack);
  const stakeholderProfiles = useAppStore((s) => s.stakeholderProfiles);

  const [keyMsgDraft, setKeyMsgDraft] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  function update(updates: Partial<TalkTrack>) {
    updateTalkTrack(track.id, updates);
  }

  function addSlide() {
    const slide: TalkTrackSlide = {
      id: generateId(),
      title: "",
      bullets: [],
    };
    update({ slides: [...track.slides, slide] });
  }

  function updateSlide(slideId: string, updates: Partial<TalkTrackSlide>) {
    update({
      slides: track.slides.map((s) => s.id === slideId ? { ...s, ...updates } : s),
    });
  }

  function deleteSlide(slideId: string) {
    update({ slides: track.slides.filter((s) => s.id !== slideId) });
  }

  function addKeyMsg() {
    const trimmed = keyMsgDraft.trim();
    if (!trimmed) return;
    update({ keyMessages: [...track.keyMessages, trimmed] });
    setKeyMsgDraft("");
  }

  async function runAI() {
    if (!aiPrompt.trim() || !GEMINI_KEY) return;
    setAiLoading(true);
    setAiError(null);

    try {
      const ai = new GoogleGenerativeAI(GEMINI_KEY);
      const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });

      const linked = stakeholderProfiles.filter((p) => track.linkedStakeholderIds.includes(p.id));
      const stakeholderContext = linked.length > 0
        ? linked.map((p) => `${p.name} (${p.role}): priorities=[${p.priorities.join(", ")}], concerns=[${p.concerns.join(", ")}]`).join("\n")
        : "No stakeholder profiles linked.";

      const currentState = JSON.stringify({
        title: track.title,
        audience: track.audience,
        goal: track.goal,
        keyMessages: track.keyMessages,
        slides: track.slides.map((s) => ({ title: s.title, bullets: s.bullets })),
      }, null, 2);

      const systemPrompt = `You are helping shape a talk track. The user wants MINIMAL intervention — trim and sharpen only, do not rewrite or replace. Return ONLY valid JSON in this exact shape:
{
  "keyMessages": string[],
  "slides": Array<{ id: string, title: string, bullets: string[] }>
}

Linked stakeholders:
${stakeholderContext}

Current talk track:
${currentState}

User instruction: ${aiPrompt}`;

      const result = await model.generateContent(systemPrompt);
      const text = result.response.text().trim();
      const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/) ?? [null, text];
      const parsed = JSON.parse(jsonMatch[1] ?? text);

      if (parsed.keyMessages) update({ keyMessages: parsed.keyMessages });
      if (parsed.slides) {
        update({
          slides: parsed.slides.map((s: any) => ({
            ...track.slides.find((ts) => ts.id === s.id) ?? { id: s.id ?? generateId(), speakerNotes: undefined },
            title: s.title,
            bullets: s.bullets,
          })),
        });
      }
      setAiPrompt("");
    } catch (err: any) {
      setAiError(err.message ?? "AI request failed");
    } finally {
      setAiLoading(false);
    }
  }

  const linkedIds = new Set(track.linkedStakeholderIds);

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {/* Header fields */}
      <div className="px-6 py-4 border-b border-slate-100 space-y-2">
        <input
          value={track.title}
          onChange={(e) => update({ title: e.target.value })}
          className="w-full text-xl font-semibold text-slate-900 bg-transparent outline-none border-b border-transparent focus:border-slate-300 pb-0.5"
          placeholder="Talk track title…"
        />
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Audience</label>
            <input
              value={track.audience}
              onChange={(e) => update({ audience: e.target.value })}
              className="w-full text-sm text-slate-700 bg-transparent outline-none border-b border-slate-200 focus:border-slate-400 mt-0.5"
              placeholder="Who is this for?"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Goal</label>
            <input
              value={track.goal}
              onChange={(e) => update({ goal: e.target.value })}
              className="w-full text-sm text-slate-700 bg-transparent outline-none border-b border-slate-200 focus:border-slate-400 mt-0.5"
              placeholder="What do you want them to do/think?"
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {/* Key Messages */}
        <div>
          <label className="text-xs font-semibold text-blue-600 uppercase tracking-wide block mb-2">Key Messages</label>
          <div className="space-y-1.5">
            {track.keyMessages.map((msg, i) => (
              <div key={i} className="flex items-start gap-2 group">
                <span className="text-blue-400 mt-0.5 text-xs font-bold flex-shrink-0">{i + 1}.</span>
                <input
                  value={msg}
                  onChange={(e) => {
                    const msgs = [...track.keyMessages];
                    msgs[i] = e.target.value;
                    update({ keyMessages: msgs });
                  }}
                  className="flex-1 text-sm text-slate-700 bg-transparent outline-none border-b border-transparent focus:border-slate-300"
                />
                <button
                  onClick={() => update({ keyMessages: track.keyMessages.filter((_, idx) => idx !== i) })}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-200 hover:text-red-400"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <div className="flex gap-1.5 pt-1">
              <span className="text-blue-200 text-xs font-bold mt-1 flex-shrink-0">{track.keyMessages.length + 1}.</span>
              <input
                value={keyMsgDraft}
                onChange={(e) => setKeyMsgDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyMsg(); } }}
                placeholder="Add key message…"
                className="flex-1 text-sm bg-transparent outline-none border-b border-slate-200 focus:border-slate-400 placeholder:text-slate-300 text-slate-700"
              />
              <button onClick={addKeyMsg} className="text-xs text-slate-400 hover:text-slate-700 px-1">+</button>
            </div>
          </div>
        </div>

        {/* Linked stakeholders */}
        {stakeholderProfiles.length > 0 && (
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-2">Linked Stakeholders</label>
            <div className="flex flex-wrap gap-2">
              {stakeholderProfiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    const next = new Set(linkedIds);
                    if (next.has(p.id)) next.delete(p.id); else next.add(p.id);
                    update({ linkedStakeholderIds: Array.from(next) });
                  }}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                    linkedIds.has(p.id)
                      ? "bg-orange-100 text-orange-800 ring-1 ring-orange-400"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  )}
                >
                  <span className={cn("w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0", p.avatarColor)}>
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Slides */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Slides</label>
            <button
              onClick={addSlide}
              className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 transition-colors"
            >
              <Plus size={12} /> Add Slide
            </button>
          </div>
          <div className="space-y-3">
            {track.slides.map((slide, i) => (
              <SlideCard
                key={slide.id}
                slide={slide}
                index={i}
                onUpdate={(updates) => updateSlide(slide.id, updates)}
                onDelete={() => deleteSlide(slide.id)}
              />
            ))}
            {track.slides.length === 0 && (
              <div className="text-center py-6 text-sm text-slate-300 border-2 border-dashed border-slate-100 rounded-xl">
                No slides yet.{" "}
                <button onClick={addSlide} className="text-blue-400 hover:underline">Add one</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI bar */}
      <div className="border-t border-slate-100 px-4 py-3 bg-slate-50/80">
        {aiError && <p className="text-xs text-red-500 mb-1.5">{aiError}</p>}
        <div className="flex gap-2 items-center">
          <Sparkles size={14} className="text-slate-400 flex-shrink-0" />
          <input
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); runAI(); } }}
            placeholder="Shape or trim this talk track… (Enter to run)"
            className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
            disabled={aiLoading}
          />
          <button
            onClick={runAI}
            disabled={!aiPrompt.trim() || aiLoading}
            className="text-xs font-medium px-3 py-1.5 rounded-md bg-slate-800 text-white disabled:opacity-40 hover:bg-slate-700 transition-colors"
          >
            {aiLoading ? "…" : "Run"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TalkTracksView() {
  const talkTracks = useAppStore((s) => s.talkTracks);
  const addTalkTrack = useAppStore((s) => s.addTalkTrack);
  const deleteTalkTrack = useAppStore((s) => s.deleteTalkTrack);

  const [selectedId, setSelectedId] = useState<string | null>(
    talkTracks[0]?.id ?? null
  );

  const selected = talkTracks.find((t) => t.id === selectedId) ?? null;

  function handleNew() {
    const now = new Date().toISOString();
    const track: TalkTrack = {
      id: generateId(),
      title: "New Talk Track",
      audience: "",
      goal: "",
      keyMessages: [],
      slides: [],
      linkedStakeholderIds: [],
      createdAt: now,
      updatedAt: now,
    };
    addTalkTrack(track);
    setSelectedId(track.id);
  }

  return (
    <div className="flex h-full bg-white">
      {/* Left panel */}
      <div className="w-64 flex-shrink-0 border-r border-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Talk Tracks</h2>
          <button
            onClick={handleNew}
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {talkTracks.length === 0 && (
            <div className="p-4 text-center text-sm text-slate-400">
              No talk tracks yet.<br />
              <button onClick={handleNew} className="mt-2 text-blue-500 hover:underline text-xs">Create one</button>
            </div>
          )}
          {talkTracks.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={cn(
                "w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3",
                selectedId === t.id && "bg-blue-50 border-r-2 border-blue-500"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 truncate">{t.title}</div>
                <div className="text-xs text-slate-400 truncate">{t.audience || "No audience set"}</div>
                <div className="text-xs text-slate-300">{t.slides.length} slide{t.slides.length !== 1 ? "s" : ""}</div>
              </div>
              <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>

      {/* Right panel */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Last updated {new Date(selected.updatedAt).toLocaleDateString()}
            </span>
            <button
              onClick={() => {
                deleteTalkTrack(selected.id);
                const remaining = talkTracks.filter((t) => t.id !== selected.id);
                setSelectedId(remaining[0]?.id ?? null);
              }}
              className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <TrackDetail key={selected.id} track={selected} />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-300 text-sm">
          Select a talk track or create one
        </div>
      )}
    </div>
  );
}
