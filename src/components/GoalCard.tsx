import React from "react";
import type { Goal } from "@/domain/types";
import { Trash2, GripVertical, CheckCircle2, Calendar } from "lucide-react";
import { cn } from "@/domain/utils";

interface GoalCardProps {
  goal: Goal;
  rank: number;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
  dragAttributes?: any;
  dragListeners?: any;
}

export const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  rank,
  isSelected,
  onClick,
  onDelete,
  dragAttributes,
  dragListeners,
}) => {
  const isCompleted = goal.progress === 100;

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative bg-white border rounded-xl p-4 cursor-pointer transition-all flex gap-4 items-center",
        isSelected
          ? "border-blue-400 ring-1 ring-blue-400 shadow-sm"
          : "border-slate-200 hover:shadow-sm",
        isCompleted && "opacity-70"
      )}
    >
      {/* Drag Handle */}
      <div
        {...dragAttributes}
        {...dragListeners}
        className="text-slate-300 hover:text-slate-500 cursor-grab"
      >
        <GripVertical size={18} />
      </div>

      {/* Rank */}
      <div
        className={cn(
          "text-4xl font-black w-12 text-center select-none",
          isCompleted ? "text-slate-200" : "text-slate-100"
        )}
      >
        {String(rank).padStart(2, "0")}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3
            className={cn(
              "font-semibold truncate",
              isCompleted && "line-through text-slate-500"
            )}
          >
            {goal.title}
          </h3>
          {isCompleted && (
            <CheckCircle2 size={16} className="text-green-500" />
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
          <div className="flex items-center gap-1">
            <Calendar size={12} />
            {goal.startDate} → {goal.endDate}
          </div>
          <span>{goal.progress}%</span>
        </div>

        {/* Progress Bar */}
        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full transition-all",
              isCompleted ? "bg-green-500" : goal.color
            )}
            style={{ width: `${goal.progress}%` }}
          />
        </div>
      </div>

      {/* Delete */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
};