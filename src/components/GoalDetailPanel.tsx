// FILE: src/components/GoalDetailPanel.tsx
import React from "react";
import type { Goal } from "@/domain/types";
import { X, Calendar, Target } from "lucide-react";
import { cn } from "@/domain/utils";
import { WysiwygEditor } from "./WysiwygEditor";

interface GoalDetailPanelProps {
  goal: Goal;
  onClose: () => void;
  onUpdate: (updates: Partial<Goal>) => void;
}

export const GoalDetailPanel: React.FC<GoalDetailPanelProps> = ({
  goal,
  onClose,
  onUpdate,
}) => {
  return (
    <div className="w-full lg:w-1/2 flex flex-col bg-slate-50/50 h-full border-l">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <button
          onClick={onClose}
          className="lg:hidden flex items-center gap-1 text-slate-500 text-sm"
        >
          <X size={16} /> Close
        </button>

        <div className="hidden lg:block text-xs font-bold text-slate-400 uppercase">
          Goal Details
        </div>

        <div className="flex items-center gap-2 text-sm font-medium">
          <div
            className={cn(
              "w-2.5 h-2.5 rounded-full",
              goal.progress === 100 ? "bg-green-500" : goal.color
            )}
          />
          {goal.progress}%
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl mx-auto space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
              Goal Title
            </label>
            <input
              value={goal.title}
              onChange={(e) => onUpdate({ title: e.target.value })}
              className={cn(
                "w-full text-2xl font-bold bg-transparent border-b border-transparent focus:border-blue-500 outline-none",
                goal.progress === 100 && "line-through text-slate-500"
              )}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                Start Date
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={goal.startDate}
                  onChange={(e) =>
                    onUpdate({ startDate: e.target.value })
                  }
                  className="w-full pl-9 pr-2 py-2 text-sm border rounded bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                End Date
              </label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="date"
                  value={goal.endDate}
                  onChange={(e) =>
                    onUpdate({ endDate: e.target.value })
                  }
                  className="w-full pl-9 pr-2 py-2 text-sm border rounded bg-white"
                />
              </div>
            </div>
          </div>

          {/* Progress */}
          <div>
            <label className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase mb-2">
              <span className="flex items-center gap-2">
                <Target size={14} />
                Progress
              </span>
              <span className="text-slate-600">{goal.progress}%</span>
            </label>

            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={goal.progress}
              onChange={(e) =>
                onUpdate({ progress: Number(e.target.value) })
              }
              className="w-full accent-blue-600"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
              Notes & Milestones
            </label>
            <div className="bg-white border rounded p-3 min-h-[250px]">
            <WysiwygEditor
  initialContent={goal.description}
  onChange={(html) => onUpdate({ description: html })}
  onBlur={() => {}}
  placeholder="Add milestones, notes, or context…"
  className="prose prose-sm max-w-none"
/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};