import React from 'react';
import { format, isToday } from 'date-fns';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';

import { TaskCard } from '@/components/TaskCard';
import { Task, TaskStatus, TaskPriority } from '@/domain/types';
import { cn, formatDateKey } from '@/domain/utils';

interface ColumnProps {
  date: Date;
  tasks: Task[];
  onAddTask: (dateStr: string) => void;
  onUpdateTaskStatus: (id: string, status: TaskStatus) => void;
  onUpdateTaskPriority: (id: string, priority: TaskPriority) => void;
  onUpdateTaskContent: (id: string, content: string) => void;
  onDeleteTask: (id: string) => void;
  onUpdateTaskTitle: (id: string, title: string) => void;   // <-- REQUIRED
}

export const Column: React.FC<ColumnProps> = ({
  date,
  tasks,
  onAddTask,
  onUpdateTaskStatus,
  onUpdateTaskPriority,
  onUpdateTaskContent,
  onDeleteTask,
  onUpdateTaskTitle,   // <-- MUST BE ACCEPTED HERE
}) => {
  const dateStr = formatDateKey(date);
  const isCurrentDay = isToday(date);

  const { setNodeRef, isOver } = useDroppable({
    id: dateStr,
    data: {
      type: 'Column',
      dateStr,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col h-full min-w-[320px] max-w-[400px] w-full border-r border-slate-200 last:border-r-0 transition-all duration-200 shrink-0",
        isCurrentDay ? "bg-blue-50/30" : "bg-white",
        isOver && "bg-blue-50 ring-2 ring-blue-300 ring-inset z-10"
      )}
    >
      <div
        className={cn(
          "p-3 flex flex-col gap-1 border-b sticky top-0 z-10 bg-white/80 backdrop-blur-sm",
          isCurrentDay && "border-blue-100 bg-blue-50/80",
          isOver && "bg-blue-100/50"
        )}
      >
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          {format(date, 'EEE')}
        </span>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "text-lg font-bold flex items-center justify-center w-8 h-8 rounded-full",
                isCurrentDay ? "bg-blue-600 text-white" : "text-slate-700"
              )}
            >
              {format(date, 'd')}
            </span>
            {isCurrentDay && (
              <span className="text-xs font-medium text-blue-600">Today</span>
            )}
          </div>

          {tasks.length > 0 && (
            <div className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
              {tasks.length}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-3 overflow-y-auto flex flex-col gap-2">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task, index) => {
            const isCompleted = task.status === 'done' || task.status === 'missed';
            const prevTask = tasks[index - 1];
            const showSeparator =
              isCompleted &&
              (!prevTask || (prevTask.status !== 'done' && prevTask.status !== 'missed'));

            return (
              <React.Fragment key={task.id}>
                {showSeparator && (
                  <div className="flex items-center gap-2 py-2 px-1 opacity-60">
                    <div className="h-px bg-slate-200 flex-1" />
                    <span className="text-[10px] uppercase font-bold text-slate-300">
                      Done
                    </span>
                    <div className="h-px bg-slate-200 flex-1" />
                  </div>
                )}

                <TaskCard
                  task={task}
                  onUpdateStatus={onUpdateTaskStatus}
                  onUpdatePriority={onUpdateTaskPriority}
                  onUpdateContent={onUpdateTaskContent}
                  onUpdateTitle={onUpdateTaskTitle}  
                  onDelete={onDeleteTask}
                />
              </React.Fragment>
            );
          })}
        </SortableContext>

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