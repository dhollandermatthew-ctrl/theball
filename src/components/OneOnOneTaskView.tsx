// FILE: src/components/OneOnOneTaskView.tsx

import React, { useMemo, useState, useCallback } from "react";
import { Calendar, ChevronDown, Plus } from "lucide-react";

import { OneOnOnePerson } from "@/domain/state";
import { Task } from "@/domain/types";
import { cn } from "@/domain/utils";

import { TaskCard } from "./TaskCard";

/* ------------------------------------------------------------------ */
/* TYPES */
/* ------------------------------------------------------------------ */

interface OneOnOneTaskViewProps {
  person: OneOnOnePerson;
  tasks: Task[];

  onCreateTask: (personId: string, content: string) => void;

  onUpdateTaskStatus: (id: string, status: Task["status"]) => void;
  onUpdateTaskPriority: (id: string, priority: Task["priority"]) => void;
  onUpdateTaskContent: (id: string, content: string) => void;
  onUpdateTaskTitle: (id: string, title: string) => void;
  onDeleteTask: (id: string) => void;
}

/* ------------------------------------------------------------------ */
/* HELPERS */
/* ------------------------------------------------------------------ */

const PRIORITY_ORDER: Record<Task["priority"], number> = {
  p1: 0,
  p2: 1,
  p3: 2,
};

const sortByRelevance = (a: Task, b: Task) => {
    const priorityDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
  
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  };

const getTaskSignals = (task: Task) => {
  const created = new Date(task.createdAt).getTime();
  const ageDays = (Date.now() - created) / (1000 * 60 * 60 * 24);

  return {
    isAging: ageDays >= 14 && task.status === "todo",
  };
};

const SectionHeader = ({
  label,
  count,
  action,
}: {
  label: string;
  count: number;
  action?: React.ReactNode;
}) => (
  <div className="flex items-center justify-between mb-2">
    <h2 className="text-xs font-semibold uppercase text-slate-500 tracking-wide">
      {label} · {count}
    </h2>
    {action}
  </div>
);

const AddButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg",
      "text-xs font-semibold text-slate-500 hover:text-slate-700",
      "hover:bg-slate-50 transition"
    )}
  >
    <Plus size={16} />
    Add task
  </button>
);

/* ------------------------------------------------------------------ */
/* VIEW */
/* ------------------------------------------------------------------ */

export const OneOnOneTaskView: React.FC<OneOnOneTaskViewProps> = ({
  person,
  tasks,
  onCreateTask,
  onUpdateTaskStatus,
  onUpdateTaskPriority,
  onUpdateTaskContent,
  onUpdateTaskTitle,
  onDeleteTask,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(person.name);
  const [showDone, setShowDone] = useState(false);

  const openTasks = useMemo(
    () => tasks.filter((t) => t.status === "todo").slice().sort(sortByRelevance),
    [tasks]
  );

  const waitingTasks = useMemo(
    () =>
      tasks.filter((t) => t.status === "in_progress").slice().sort(sortByRelevance),
    [tasks]
  );

  const doneTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status === "done")
        .slice()
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        ),
    [tasks]
  );

  /* Create empty task → title auto-selects via TaskCard isNewTask */
  const handleCreate = useCallback(() => {
    onCreateTask(person.id, "title");
  }, [onCreateTask, person.id]);

  const renderCard = useCallback(
    (task: Task) => (
      <TaskCard
        key={task.id}
        task={task}
        disableDrag
        showMissedStatus={false}
        density="comfortable"
        isNewTask={task.title === "title"}
        onUpdateStatus={onUpdateTaskStatus}
        onUpdatePriority={onUpdateTaskPriority}
        onUpdateContent={onUpdateTaskContent}
        onUpdateTitle={onUpdateTaskTitle}
        onDelete={onDeleteTask}
      />
    ),
    [
      onUpdateTaskStatus,
      onUpdateTaskPriority,
      onUpdateTaskContent,
      onUpdateTaskTitle,
      onDeleteTask,
    ]
  );

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* HEADER */}
      <div className="px-4 md:px-12 pt-16 md:pt-8 pb-4 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-4 mb-6">
          <div
            className={cn(
              "w-12 h-12 md:w-16 md:h-16 rounded-xl flex items-center justify-center",
              "text-xl md:text-2xl font-bold text-white",
              person.avatarColor
            )}
          >
            {person.name.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0">
            {isEditingName ? (
              <input
                autoFocus
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={() => {
                  setIsEditingName(false);
                  setTempName(person.name);
                }}
                className="text-2xl md:text-4xl font-bold bg-transparent border-b border-slate-200 focus:outline-none focus:border-slate-400"
              />
            ) : (
              <h1
                className="text-2xl md:text-4xl font-bold cursor-text truncate"
                onClick={() => setIsEditingName(true)}
              >
                {person.name}
              </h1>
            )}

            <p className="text-slate-500 text-xs flex items-center gap-1 mt-1">
              <Calendar size={14} />
              1:1 Tasks
            </p>
          </div>
        </div>

        <div className="h-px bg-slate-200" />
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-4 md:px-12 pb-12">
        <div className="max-w-4xl mx-auto space-y-10 pt-6">
          {/* OPEN */}
          {openTasks.length > 0 && (
            <section>
              <SectionHeader
                label="Open"
                count={openTasks.length}
                action={<AddButton onClick={handleCreate} />}
              />

              <div className="space-y-3">
                {openTasks.map((task) => {
                  const { isAging } = getTaskSignals(task);
                  return (
                    <div key={task.id}>
                      {isAging && (
                        <div className="px-2 pb-1 text-[10px] uppercase font-semibold">
                          <span className="text-amber-600">Aging</span>
                        </div>
                      )}
                      {renderCard(task)}
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* WAITING */}
          {waitingTasks.length > 0 && (
            <section>
              <SectionHeader
                label="Waiting"
                count={waitingTasks.length}
                action={<AddButton onClick={handleCreate} />}
              />
              <div className="space-y-3">{waitingTasks.map(renderCard)}</div>
            </section>
          )}

          {/* ADD TASK (ABOVE DONE) */}
          <div className="pt-2">
            <button
              onClick={handleCreate}
              className={cn(
                "w-full flex items-center justify-center gap-2",
                "py-3 rounded-xl border border-dashed border-slate-200",
                "text-sm font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition"
              )}
            >
              <Plus size={18} />
              Add task
            </button>
          </div>

          {/* DONE */}
          {doneTasks.length > 0 && (
            <section>
              <button
                onClick={() => setShowDone((v) => !v)}
                className={cn(
                  "flex items-center gap-2 text-xs font-semibold uppercase",
                  "text-slate-400 hover:text-slate-600 transition mb-2"
                )}
              >
                <ChevronDown
                  size={14}
                  className={cn("transition", showDone && "rotate-180")}
                />
                Done · {doneTasks.length}
              </button>

              {showDone && (
                <div className="space-y-3 opacity-60">
                  {doneTasks.map(renderCard)}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};