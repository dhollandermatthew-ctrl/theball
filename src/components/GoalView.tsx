// FILE: src/components/GoalView.tsx
import React, { useState, useMemo } from "react";
import type { Goal } from "@/domain/types";
import { Plus } from "lucide-react";

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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const selectedGoal = goals.find((g) => g.id === selectedGoalId) ?? null;

  /* Split goals */
  const activeGoals = useMemo(
    () => goals.filter((g) => g.progress < 100),
    [goals]
  );

  const completedGoals = useMemo(
    () => goals.filter((g) => g.progress === 100),
    [goals]
  );

  /* Drag reorder (active only) */
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
          className="flex items-center gap-2 bg-slate-900 text-white px-3 py-2 rounded text-sm"
        >
          <Plus size={14} />
          New Goal
        </button>
      </div>

      {/* Timeline */}
      {activeGoals.length > 0 && (
        <div className="border-b px-6 py-4">
          <GoalTimeline goals={activeGoals} />
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