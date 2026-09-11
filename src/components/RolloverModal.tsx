import React, { useState, useMemo } from "react";
import { addDays } from "date-fns";
import { X, ArrowRight, CalendarDays } from "lucide-react";
import type { Task } from "@/domain/types";

interface RolloverModalProps {
  incompleteTasks: Task[];
  onConfirm: (taskIds: string[]) => void;
  onClose: () => void;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function nextWeekDate(dateStr: string): Date {
  const d = new Date(`${dateStr}T12:00:00`);
  return addDays(d, 7);
}

function formatDisplay(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  const next = addDays(d, 7);
  return `${DAY_NAMES[next.getDay()]} ${next.getMonth() + 1}/${next.getDate()}`;
}

export const RolloverModal: React.FC<RolloverModalProps> = ({
  incompleteTasks,
  onConfirm,
  onClose,
}) => {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(incompleteTasks.map((t) => t.id))
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const task of incompleteTasks) {
      const key = task.date || "unknown";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [incompleteTasks]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === incompleteTasks.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(incompleteTasks.map((t) => t.id)));
    }
  };

  const count = selected.size;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[480px] max-h-[80vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-blue-500" />
            <span className="font-semibold text-slate-800 text-sm">Roll to next week</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Select all row */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-50 border-b border-slate-100">
          <button
            onClick={toggleAll}
            className="text-xs text-slate-500 hover:text-slate-700 transition-colors"
          >
            {selected.size === incompleteTasks.length ? "Deselect all" : "Select all"}
          </button>
          <span className="text-xs text-slate-400">
            {count} of {incompleteTasks.length} selected
          </span>
        </div>

        {/* Task list grouped by day */}
        <div className="flex-1 overflow-y-auto">
          {grouped.map(([dateKey, tasks]) => {
            const dayDate = new Date(`${dateKey}T12:00:00`);
            const nextDate = nextWeekDate(dateKey);

            return (
              <div key={dateKey}>
                {/* Day header */}
                <div className="flex items-center gap-2 px-5 py-2 bg-slate-50 border-b border-slate-100 sticky top-0">
                  <span className="text-xs font-medium text-slate-500">
                    {DAY_NAMES_FULL[dayDate.getDay()]}
                  </span>
                  <ArrowRight size={11} className="text-slate-300" />
                  <span className="text-xs font-medium text-blue-500">
                    {DAY_NAMES_FULL[nextDate.getDay()]} {nextDate.getMonth() + 1}/{nextDate.getDate()}
                  </span>
                </div>

                {/* Tasks */}
                {tasks.map((task) => {
                  const isSelected = selected.has(task.id);
                  return (
                    <button
                      key={task.id}
                      onClick={() => toggle(task.id)}
                      className={`w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-slate-50 border-b border-slate-50 ${
                        isSelected ? "" : "opacity-40"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? "bg-blue-600 border-blue-600"
                            : "border-slate-300"
                        }`}
                      >
                        {isSelected && (
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                            <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                      <span className="text-xs text-slate-700 truncate flex-1">{task.title}</span>
                      {isSelected && (
                        <span className="text-xs text-slate-400 shrink-0">{formatDisplay(task.date!)}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={count === 0}
            onClick={() => {
              onConfirm([...selected]);
              onClose();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Move {count > 0 ? count : ""} task{count !== 1 ? "s" : ""} to next week
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
