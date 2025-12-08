// FILE: src/components/MonthView.tsx
import React, { useState } from "react";
import {
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from "date-fns";

import { Task, TaskCategory } from "@/domain/types";
import { cn, formatDateKey } from "@/domain/utils";

import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { useDroppable } from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

/* -------------------- Props -------------------- */

interface MonthViewProps {
  currentDate: Date;
  tasks: Task[];
  category: TaskCategory;
  onDateClick: (date: Date) => void;

  // Used to move tasks between days
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
}

/* -------------------- Helpers -------------------- */

const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const stripHtml = (html: string) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

// Priority ordering: p1 > p2 > p3 > done
const priorityRank = (task: Task) => {
  if (task.status === "done") return 3;
  if (task.priority === "p1") return 0;
  if (task.priority === "p2") return 1;
  return 2;
};

/* -------------------- Drag components -------------------- */

interface DayCellProps {
  day: Date;
  dateKey: string;
  tasks: Task[];
  isCurrentMonth: boolean;
  isTodayFlag: boolean;
  onDateClick: (date: Date) => void;
}

const DayCell: React.FC<DayCellProps> = ({
  day,
  dateKey,
  tasks,
  isCurrentMonth,
  isTodayFlag,
  onDateClick,
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateKey}`,
    data: { type: "day", dateKey },
  });

  const sortedTasks = [...tasks].sort(
    (a, b) => priorityRank(a) - priorityRank(b)
  );

  return (
    <div
      ref={setNodeRef}
      onClick={() => onDateClick(day)}
      className={cn(
        "border-b border-r border-slate-100 p-2 cursor-pointer transition-colors flex flex-col gap-1 group relative",
        !isCurrentMonth
          ? "bg-slate-50/50 text-slate-400"
          : "bg-white hover:bg-blue-50/20",
        isOver && "ring-2 ring-blue-300 ring-inset"
      )}
    >
      {/* DAY NUMBER */}
      <div className="flex justify-between items-start mb-1">
        <span
          className={cn(
            "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-all",
            isTodayFlag
              ? "bg-blue-600 text-white shadow-sm"
              : "text-slate-700 group-hover:bg-slate-100"
          )}
        >
          {format(day, "d")}
        </span>
      </div>

      {/* TASK LIST WITH SCROLL */}
      <div className="flex flex-col gap-1 w-full overflow-y-auto max-h-[150px] pr-1">
        {sortedTasks.map((task) => (
          <MonthTaskPill key={task.id} task={task} dateKey={dateKey} />
        ))}
      </div>
    </div>
  );
};

/* -------------------- Task Pill -------------------- */

const MonthTaskPill: React.FC<{ task: Task; dateKey: string }> = ({
  task,
  dateKey,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
    data: {
      type: "task",
      taskId: task.id,
      dateKey,
    },
  });

  // Clean, TS-safe draggable style
  const style: React.CSSProperties = {
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    transition: isDragging ? "none" : "transform 150ms ease",
    opacity: isDragging ? 0.5 : 1,
  };

  const plainText = stripHtml(task.content) || "Untitled Task";
  const isDone = task.status === "done";

  const pillStyle = isDone
    ? "bg-slate-100 border-slate-200 text-slate-400 border-l-slate-300 line-through"
    : task.priority === "p1"
    ? "bg-red-50 border-red-100 text-red-800 border-l-red-500"
    : task.priority === "p2"
    ? "bg-amber-50 border-amber-100 text-amber-800 border-l-amber-500"
    : "bg-white border-slate-100 text-slate-600 border-l-blue-400";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "text-[10px] truncate px-1.5 py-0.5 rounded border shadow-sm select-none",
        pillStyle
      )}
    >
      {plainText}
    </div>
  );
};

/* -------------------- Main Component -------------------- */

export const MonthView: React.FC<MonthViewProps> = ({
  currentDate,
  tasks,
  category,
  onDateClick,
  onUpdateTask,
}) => {
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const monthStart = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );
  const monthEnd = endOfMonth(monthStart);

  const startDate = new Date(monthStart);
  startDate.setDate(monthStart.getDate() - monthStart.getDay());

  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.type === "task") {
      setActiveTaskId(event.active.id as string);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTaskId(null);

    if (!over) return;

    const activeTask = tasks.find((t) => t.id === active.id);
    if (!activeTask) return;

    let targetDateKey: string | null = null;

    if (over.data.current?.type === "day") {
      targetDateKey = over.data.current.dateKey;
    } else if (typeof over.id === "string") {
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask) targetDateKey = overTask.date;
    }

    if (!targetDateKey || targetDateKey === activeTask.date) return;

    onUpdateTask(activeTask.id, { date: targetDateKey });
  };

  // Group tasks by date
  const tasksByDate: Record<string, Task[]> = {};
  for (const t of tasks) {
    if (t.category !== category) continue;
    if (!tasksByDate[t.date]) tasksByDate[t.date] = [];
    tasksByDate[t.date].push(t);
  }

  const activeTask =
    activeTaskId ? tasks.find((t) => t.id === activeTaskId) || null : null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-full bg-white overflow-hidden animate-in fade-in duration-300">
        {/* WEEKDAY HEADER */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 shrink-0">
          {weekDays.map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider"
            >
              {day}
            </div>
          ))}
        </div>

        {/* CALENDAR GRID */}
        <div className="grid grid-cols-7 auto-rows-[200px] overflow-y-auto">
          {days.map((day) => {
            const dateKey = formatDateKey(day);
            const dayTasks = tasksByDate[dateKey] || [];

            return (
              <DayCell
                key={dateKey}
                day={day}
                dateKey={dateKey}
                tasks={dayTasks}
                isCurrentMonth={isSameMonth(day, monthStart)}
                isTodayFlag={isToday(day)}
                onDateClick={onDateClick}
              />
            );
          })}
        </div>
      </div>

      {/* DRAG PREVIEW */}
      <DragOverlay>
        {activeTask ? (
          <div className="pointer-events-none">
            <MonthTaskPill task={activeTask} dateKey={activeTask.date} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};