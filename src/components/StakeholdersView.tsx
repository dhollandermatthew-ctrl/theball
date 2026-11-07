import React, { useState } from "react";
import { useAppStore } from "@/domain/state";
import { StakeholderProfile, StakeholderInfluence } from "@/domain/types";
import { generateId, getRandomColor } from "@/domain/utils";
import { Plus, Trash2, ChevronRight, X } from "lucide-react";
import { cn } from "@/domain/utils";

const INFLUENCE_LABELS: Record<StakeholderInfluence, { label: string; color: string }> = {
  champion:         { label: "Champion",       color: "bg-emerald-100 text-emerald-800" },
  "decision-maker": { label: "Decision Maker", color: "bg-blue-100 text-blue-800" },
  influencer:       { label: "Influencer",     color: "bg-violet-100 text-violet-800" },
  blocker:          { label: "Blocker",        color: "bg-red-100 text-red-800" },
  unknown:          { label: "Unknown",        color: "bg-slate-100 text-slate-600" },
};

const SECTION_CONFIG = [
  { key: "priorities" as const,     label: "Priorities",         placeholder: "What they care most about…", color: "text-blue-600" },
  { key: "concerns" as const,       label: "Concerns",           placeholder: "Objections, red flags…",     color: "text-red-600" },
  { key: "whatLands" as const,      label: "What Lands",         placeholder: "Approaches that work…",      color: "text-emerald-600" },
  { key: "whatBackfires" as const,  label: "What Backfires",     placeholder: "Things that push them away…",color: "text-orange-600" },
  { key: "knownUnknowns" as const,  label: "Known Unknowns",     placeholder: "We don't know their view on…", color: "text-slate-500" },
];

function TagList({
  items,
  color,
  placeholder,
  onChange,
}: {
  items: string[];
  color: string;
  placeholder: string;
  onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
    setDraft("");
  }

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 group">
          <span className={cn("mt-0.5 text-xs font-bold", color)}>·</span>
          <span className="flex-1 text-sm text-slate-700 leading-snug">{item}</span>
          <button
            onClick={() => onChange(items.filter((_, idx) => idx !== i))}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-400 mt-0.5"
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <div className="flex gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder}
          className="flex-1 text-sm bg-transparent border-b border-slate-200 focus:border-slate-400 outline-none py-0.5 placeholder:text-slate-300 text-slate-700"
        />
        <button onClick={add} className="text-xs text-slate-400 hover:text-slate-700 px-1">+</button>
      </div>
    </div>
  );
}

function ProfileDetail({ profile }: { profile: StakeholderProfile }) {
  const updateStakeholderProfile = useAppStore((s) => s.updateStakeholderProfile);

  function update(updates: Partial<StakeholderProfile>) {
    updateStakeholderProfile(profile.id, updates);
  }

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg flex-shrink-0", profile.avatarColor)}>
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <input
            value={profile.name}
            onChange={(e) => update({ name: e.target.value })}
            className="w-full text-xl font-semibold text-slate-900 bg-transparent border-none outline-none focus:border-b focus:border-slate-300"
            placeholder="Name"
          />
          <div className="flex gap-2 mt-1 flex-wrap">
            <input
              value={profile.role}
              onChange={(e) => update({ role: e.target.value })}
              className="text-sm text-slate-500 bg-transparent outline-none border-b border-transparent focus:border-slate-300 flex-1 min-w-0"
              placeholder="Role"
            />
            <input
              value={profile.company ?? ""}
              onChange={(e) => update({ company: e.target.value || undefined })}
              className="text-sm text-slate-400 bg-transparent outline-none border-b border-transparent focus:border-slate-300 flex-1 min-w-0"
              placeholder="Company"
            />
          </div>
        </div>
      </div>

      {/* Influence */}
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-2">Influence Level</label>
        <div className="flex gap-2 flex-wrap">
          {(Object.keys(INFLUENCE_LABELS) as StakeholderInfluence[]).map((inf) => (
            <button
              key={inf}
              onClick={() => update({ influence: inf })}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                profile.influence === inf
                  ? INFLUENCE_LABELS[inf].color + " ring-2 ring-offset-1 ring-current"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              )}
            >
              {INFLUENCE_LABELS[inf].label}
            </button>
          ))}
        </div>
      </div>

      {/* Sections */}
      {SECTION_CONFIG.map(({ key, label, placeholder, color }) => (
        <div key={key}>
          <label className={cn("text-xs font-semibold uppercase tracking-wide block mb-2", color)}>{label}</label>
          <TagList
            items={profile[key]}
            color={color}
            placeholder={placeholder}
            onChange={(items) => update({ [key]: items })}
          />
        </div>
      ))}

      {/* Notes */}
      <div>
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide block mb-2">Raw Intel / Notes</label>
        <textarea
          value={profile.notes}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Freeform notes, context, raw intel…"
          rows={5}
          className="w-full text-sm text-slate-700 bg-slate-50 rounded-lg p-3 outline-none focus:ring-1 focus:ring-slate-300 resize-none placeholder:text-slate-300 leading-relaxed"
        />
      </div>
    </div>
  );
}

export function StakeholdersView() {
  const stakeholderProfiles = useAppStore((s) => s.stakeholderProfiles);
  const addStakeholderProfile = useAppStore((s) => s.addStakeholderProfile);
  const deleteStakeholderProfile = useAppStore((s) => s.deleteStakeholderProfile);

  const [selectedId, setSelectedId] = useState<string | null>(
    stakeholderProfiles[0]?.id ?? null
  );

  const selected = stakeholderProfiles.find((p) => p.id === selectedId) ?? null;

  function handleNew() {
    const now = new Date().toISOString();
    const profile: StakeholderProfile = {
      id: generateId(),
      name: "New Stakeholder",
      role: "",
      company: undefined,
      avatarColor: getRandomColor(),
      influence: "unknown",
      priorities: [],
      concerns: [],
      whatLands: [],
      whatBackfires: [],
      knownUnknowns: [],
      notes: "",
      createdAt: now,
      updatedAt: now,
    };
    addStakeholderProfile(profile);
    setSelectedId(profile.id);
  }

  return (
    <div className="flex h-full bg-white">
      {/* Left panel — list */}
      <div className="w-64 flex-shrink-0 border-r border-slate-100 flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-700">Stakeholders</h2>
          <button
            onClick={handleNew}
            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <Plus size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {stakeholderProfiles.length === 0 && (
            <div className="p-4 text-center text-sm text-slate-400">
              No stakeholders yet.<br />
              <button onClick={handleNew} className="mt-2 text-orange-500 hover:underline text-xs">Add one</button>
            </div>
          )}
          {stakeholderProfiles.map((p) => {
            const inf = INFLUENCE_LABELS[p.influence];
            return (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={cn(
                  "w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3",
                  selectedId === p.id && "bg-orange-50 border-r-2 border-orange-500"
                )}
              >
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0", p.avatarColor)}>
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800 truncate">{p.name}</div>
                  <div className="text-xs text-slate-400 truncate">{p.role || p.company || "No role"}</div>
                  <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", inf.color)}>{inf.label}</span>
                </div>
                <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Right panel — detail */}
      {selected ? (
        <div className="flex-1 flex flex-col min-w-0">
          <div className="border-b border-slate-100 px-6 py-3 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Last updated {new Date(selected.updatedAt).toLocaleDateString()}
            </span>
            <button
              onClick={() => {
                deleteStakeholderProfile(selected.id);
                const remaining = stakeholderProfiles.filter((p) => p.id !== selected.id);
                setSelectedId(remaining[0]?.id ?? null);
              }}
              className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <ProfileDetail key={selected.id} profile={selected} />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-slate-300 text-sm">
          Select a stakeholder or create one
        </div>
      )}
    </div>
  );
}
