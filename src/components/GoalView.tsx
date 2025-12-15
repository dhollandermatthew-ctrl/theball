// FILE: src/components/GoalView.tsx
import React, { useState, useMemo } from "react";
import type { Goal } from "@/domain/types";
import { Plus, Archive, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/domain/utils";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { GoalCard } from "./GoalCard";
import { GoalTimeline } from "./GoalTimeline";
import { GoalDetailPanel } from "./GoalDetailPanel";

interface GoalViewProps {
  goals: Goal[];
  onAddGoal: () => void;
  onUpdateGoal: (id: string, updates: Partial<Goal>) => void;
  onDeleteGoal: (id: string) => void;
  onReorderGoals: (goals: Goal[]) => void;
}

/* ---------------------------- */
/* Sortable Wrapper */
/* ---------------------------- */
const SortableGoalCard: React.FC<{
  goal: Goal;
  rank: number;
  isSelected: boolean;
  onClick: () => void;
  onDelete: () => void;
}> = ({ goal, rank, isSelected, onClick, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: goal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <GoalCard
        goal={goal}
        rank={rank}
        isSelected={isSelected}
        onClick={onClick}
        onDelete={onDelete}
        dragAttributes={attributes}
        dragListeners={listeners}
      />
    </div>
  );
};

/* ---------------------------- */
/* Goal View */
/* ---------------------------- */
export const GoalView: React.FC<GoalViewProps> = ({
  goals,
  onAddGoal,
  onUpdateGoal,
  onDeleteGoal,
  onReorderGoals,
}) => {
    const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
    const [showCompleted, setShowCompleted] = useState(false);
    const [isRoadmapExpanded, setIsRoadmapExpanded] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const selectedGoal = goals.find((g) => g.id === selectedGoalId) ?? null;

  /* ---------------------------- */
  /* Split goals */
  /* ---------------------------- */
  const activeGoals = useMemo(
    () => goals.filter((g) => g.progress < 100),
    [goals]
  );

  const completedGoals = useMemo(
    () =>
      goals
        .filter((g) => g.progress === 100)
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() -
            new Date(a.updatedAt).getTime()
        ),
    [goals]
  );

  /* ---------------------------- */
  /* Drag reorder (active only) */
  /* ---------------------------- */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = activeGoals.findIndex((g) => g.id === active.id);
    const newIndex = activeGoals.findIndex((g) => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedActive = arrayMove(activeGoals, oldIndex, newIndex);
    onReorderGoals([...reorderedActive, ...completedGoals]);
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        <h1 className="text-xl font-semibold">Long-term Goals</h1>
        <button
  onClick={onAddGoal}
  className={cn(
    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium",
    "border border-slate-200 bg-white text-slate-700",
    "hover:bg-slate-50 hover:border-slate-300 transition-colors"
  )}
>
  <Plus size={14} className="text-slate-500" />
  New Goal
</button>
      </div>

{/* Roadmap / Timeline */}
{activeGoals.length > 0 && (
  <div className="border-b bg-white">
    {/* Header */}
    <button
      onClick={() => setIsRoadmapExpanded((v) => !v)}
      className="w-full flex items-center gap-2 px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
    >
      <span
        className={cn(
          "transition-transform",
          isRoadmapExpanded ? "rotate-180" : ""
        )}
      >
        <ChevronDown size={14} />
      </span>
      Timeline Visualization
    </button>

    {/* Body */}
    {isRoadmapExpanded && (
      <div className="px-6 py-4 animate-in slide-in-from-top-2">
        <GoalTimeline goals={activeGoals} />
      </div>
    )}
  </div>
)}

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Cards */}
        <div
          className={`flex-1 overflow-y-auto p-6 bg-slate-50/30 transition-all ${
            selectedGoal ? "lg:w-1/2 lg:flex-none border-r" : ""
          }`}
        >
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={activeGoals.map((g) => g.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3 max-w-3xl mx-auto">
                {activeGoals.map((goal, index) => (
                  <SortableGoalCard
                    key={goal.id}
                    goal={goal}
                    rank={index + 1}
                    isSelected={goal.id === selectedGoalId}
                    onClick={() => setSelectedGoalId(goal.id)}
                    onDelete={() => {
                      if (selectedGoalId === goal.id) {
                        setSelectedGoalId(null);
                      }
                      onDeleteGoal(goal.id);
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          {/* Completed Archive */}
          {completedGoals.length > 0 && (
            <div className="mt-10 max-w-3xl mx-auto">
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600"
              >
                <Archive size={14} />
                Completed Archive ({completedGoals.length})
                {showCompleted ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </button>

              {showCompleted && (
                <div className="mt-4 space-y-3 opacity-70">
                  {completedGoals.map((goal) => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      isSelected={goal.id === selectedGoalId}
                      onClick={() => setSelectedGoalId(goal.id)}
                      onDelete={() => {
                        if (selectedGoalId === goal.id) {
                          setSelectedGoalId(null);
                        }
                        onDeleteGoal(goal.id);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Detail Panel */}
        {selectedGoal ? (
          <GoalDetailPanel
            goal={selectedGoal}
            onClose={() => setSelectedGoalId(null)}
            onUpdate={(updates) =>
              onUpdateGoal(selectedGoal.id, updates)
            }
          />
        ) : (
          <div className="hidden lg:flex w-1/2 border-l items-center justify-center text-slate-400">
            Select a goal
          </div>
        )}
      </div>
    </div>
  );
};