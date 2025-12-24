// FILE: src/components/Column.tsx
import React from 'react';
import { format, isToday } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';

import { TaskCard } from '@/components/TaskCard';
import { Task, TaskStatus, TaskPriority, TaskCategory } from '@/domain/types';
import { cn, formatDateKey } from '@/domain/utils';

/* -----------------------------------------------
 * Category styles (local, no theme dependency)
 * --------------------------------------------- */
const CATEGORY_STYLES: Record<
  TaskCategory,
  {
    accent: string;
    softBg: string;
    border: string;
    accentBg: string;
  }
> = {
  work: {
    accent: 'text-blue-600',
    softBg: 'bg-blue-50/40',
    border: 'border-blue-200',
    accentBg: 'bg-blue-600',
  },
  personal: {
    accent: 'text-violet-600',
    softBg: 'bg-violet-50/40',
    border: 'border-violet-200',
    accentBg: 'bg-violet-600',
  },
};

interface ColumnProps {
  date: Date;
  tasks: Task[];
  category: TaskCategory;
  newTaskId: string | null;
  onAddTask: (dateStr: string) => void;
  onUpdateTaskStatus: (id: string, status: TaskStatus) => void;
  onUpdateTaskPriority: (id: string, priority: TaskPriority) => void;
  onUpdateTaskContent: (id: string, content: string) => void;
  onUpdateTaskTitle: (id: string, title: string) => void;
  onDeleteTask: (id: string) => void;
}

/* -----------------------------------------------
 * Section Divider
 * --------------------------------------------- */
const SectionDivider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-2 py-2 px-1 opacity-60">
    <div className="h-px bg-slate-200 flex-1" />
    <span className="text-[10px] uppercase font-bold text-slate-300">
      {label}
    </span>
    <div className="h-px bg-slate-200 flex-1" />
  </div>
);

export const Column: React.FC<ColumnProps> = ({
  date,
  tasks,
  category,
  newTaskId,
  onAddTask,
  onUpdateTaskStatus,
  onUpdateTaskPriority,
  onUpdateTaskContent,
  onUpdateTaskTitle,
  onDeleteTask,
}) => {
  const dateStr = formatDateKey(date);
  const isCurrentDay = isToday(date);
  const categoryStyles = CATEGORY_STYLES[category];

  const { setNodeRef, isOver } = useDroppable({
    id: dateStr,
    data: { type: 'Column', dateStr },
  });

  /* -----------------------------------------------
   * Explicit task grouping (NO adjacency logic)
   * --------------------------------------------- */
  const activeTasks = tasks.filter((t) => t.status === 'todo');
  const doneTasks = tasks.filter((t) => t.status === 'done');
  const missedTasks = tasks.filter((t) => t.status === 'missed');

  /* -----------------------------------------------
   * Header metrics (missed excluded)
   * --------------------------------------------- */
  const completed = doneTasks.length;
  const active = activeTasks.length;
  const total = completed + active;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col h-full min-w-[320px] max-w-[380px] w-full border-r last:border-r-0 transition-all duration-200 shrink-0 bg-white',
        isCurrentDay && categoryStyles.softBg,
        isOver && cn(categoryStyles.softBg, 'ring-2 ring-inset', categoryStyles.border)
      )}
    >
      {/* -------------------------------- Header -------------------------------- */}
      <div
        className={cn(
          'p-3 flex flex-col gap-1 border-b sticky top-0 z-10 backdrop-blur-sm bg-white/80',
          categoryStyles.border,
          isCurrentDay && categoryStyles.softBg,
          isOver && categoryStyles.softBg
        )}
      >
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {format(date, 'EEE')}
        </span>

        <div className="flex items-center justify-between">
          {/* Date bubble */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-lg font-bold flex items-center justify-center w-8 h-8 rounded-full',
                isCurrentDay
                  ? cn('text-white', categoryStyles.accentBg)
                  : 'text-slate-700'
              )}
            >
              {format(date, 'd')}
            </span>

            {isCurrentDay && (
              <span className={cn('text-xs font-medium', categoryStyles.accent)}>
                Today
              </span>
            )}
          </div>

          {/* Counters */}
          <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
            <span className="flex items-center gap-1">
              <span className="text-green-600">✓</span>
              {completed}
            </span>

            <span className="flex items-center gap-1">
              <span className="text-slate-400">•</span>
              {active}
            </span>

            <span className="flex items-center gap-1">
              <span className="text-slate-400">|</span>
              {total}
            </span>
          </div>
        </div>
      </div>

      {/* -------------------------------- Tasks -------------------------------- */}
      <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {/* ACTIVE (TODO) */}
          {activeTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              density="dense"
              isNewTask={task.id === newTaskId}
              onUpdateStatus={onUpdateTaskStatus}
              onUpdatePriority={onUpdateTaskPriority}
              onUpdateContent={onUpdateTaskContent}
              onUpdateTitle={onUpdateTaskTitle}
              onDelete={onDeleteTask}
            />
          ))}

          {/* DONE */}
          {doneTasks.length > 0 && (
            <>
              <SectionDivider label="Done" />
              {doneTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  density="dense"
                  onUpdateStatus={onUpdateTaskStatus}
                  onUpdatePriority={onUpdateTaskPriority}
                  onUpdateContent={onUpdateTaskContent}
                  onUpdateTitle={onUpdateTaskTitle}
                  onDelete={onDeleteTask}
                />
              ))}
            </>
          )}

          {/* NOT GOING TO DO */}
          {missedTasks.length > 0 && (
            <>
              <SectionDivider label="Won't Do" />
              {missedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  density="dense"
                  onUpdateStatus={onUpdateTaskStatus}
                  onUpdatePriority={onUpdateTaskPriority}
                  onUpdateContent={onUpdateTaskContent}
                  onUpdateTitle={onUpdateTaskTitle}
                  onDelete={onDeleteTask}
                />
              ))}
            </>
          )}
        </SortableContext>

        {/* Add Task */}
        <button
          onClick={() => onAddTask(dateStr)}
          className="flex items-center justify-center w-full p-2 rounded text-slate-300 hover:text-slate-500 hover:bg-slate-50 transition mt-1 group"
        >
          <Plus size={20} className="group-hover:scale-110 transition" />
        </button>
      </div>
    </div>
  );
};