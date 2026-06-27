// FILE: src/components/MonthView.tsx

import React, { useState } from "react";
import {
  endOfMonth,
  endOfWeek,
  eachDayOfInterval,
  format as formatDate,
  isSameMonth,
  isToday as isTodayFn,
} from "date-fns";
import { Task, TaskCategory } from "@/domain/types";
import { cn } from "@/domain/utils";
import { RichTextRenderer } from "@/components/RichTextRenderer";
import { X } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensors,
  useSensor,
  useDroppable,
  useDraggable,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";

/* -------------------- Task Preview Modal -------------------- */
interface TaskPreviewModalProps {
  task: Task;
  onClose: () => void;
}

const TaskPreviewModal: React.FC<TaskPreviewModalProps> = ({ task, onClose }) => {
  const isDone = task.status === "done";
  const isMissed = task.status === "missed";

  const priorityLabel =
    task.priority === "p1" ? "P1" : task.priority === "p2" ? "P2" : "P3";
  const priorityColor =
    task.priority === "p1"
      ? "bg-red-100 text-red-700"
      : task.priority === "p2"
      ? "bg-amber-100 text-amber-700"
      : "bg-slate-100 text-slate-500";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-md p-5 flex flex-col gap-3"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", priorityColor)}>
              {priorityLabel}
            </span>
            {isDone && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                Done
              </span>
            )}
            {isMissed && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                Missed
              </span>
            )}
            {task.date && (
              <span className="text-[10px] text-slate-400">
                {formatDate(new Date(task.date + "T12:00:00"), "MMM d, yyyy")}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Title */}
        <h2 className={cn("text-base font-bold text-slate-800 leading-snug", isDone && "line-through text-slate-400")}>
          {task.title || "Untitled Task"}
        </h2>

        {/* Body */}
        {task.content ? (
          <div className="text-sm text-slate-600 max-h-64 overflow-y-auto pr-1">
            <RichTextRenderer
              text={task.content}
              isCompleted={isDone}
              className="prose prose-sm max-w-none"
            />
          </div>
        ) : (
          <p className="text-sm italic text-slate-400">No details added.</p>
        )}
      </div>
    </div>
  );
};

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
  if (task.status === "done") return 4;
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
  onPreviewTask: (task: Task) => void;
}

const DayCell = ({ day, dateKey, tasks, isCurrentMonth, isTodayFlag, onDateClick, onPreviewTask }: DayCellProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `day-${dateKey}`,
    data: { type: "day", dateKey },
  });
  
  return (
    <div
      ref={setNodeRef}
      onClick={() => onDateClick(day)}
      className={cn(
        "border-b border-r border-slate-100 p-2 cursor-pointer transition-colors flex flex-col gap-1 group relative",
        !isCurrentMonth ? "bg-slate-50/50 text-slate-400" : "bg-white hover:bg-blue-50/20",
        isOver && "ring-2 ring-blue-300 ring-inset"
      )}
    >
      {/* DAY NUMBER */}
      <div className="flex justify-between items-start mb-1">
        <span
          className={cn(
            "text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full transition-all",
            isTodayFlag ? "bg-blue-600 text-white shadow-sm" : "text-slate-700 group-hover:bg-slate-100"
          )}
        >
          {formatDate(day, "d")}
        </span>
      </div>
      {/* TASK LIST WITH SCROLL */}
      <div className="flex flex-col gap-1 w-full overflow-y-auto max-h-[300px] pr-1">
        {tasks.map((task) => (
          <MonthTaskPill key={task.id} task={task} dateKey={dateKey} onPreview={onPreviewTask} />
        ))}
      </div>
    </div>
  );
};

/* -------------------- Task Pill -------------------- */
const MonthTaskPill = ({ task, dateKey, onPreview }: { task: Task; dateKey: string; onPreview: (task: Task) => void }) => {
  const isDone = task.status === "done";
  const plainText = task.title || "Untitled Task";
  const { setNodeRef, listeners, attributes, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: { type: "task", dateKey },
      disabled: isDone,
    });

  const style: React.CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onPreview(task);
      }}
      className={cn(
        "text-[10px] truncate px-1.5 py-2 rounded border shadow-sm select-none flex items-center gap-1 cursor-pointer hover:shadow-md hover:ring-1 transition-all",
        isDone
          ? "bg-slate-100 border-slate-200 text-slate-400 hover:ring-slate-300"
          : task.status === "missed"
            ? "bg-red-50 border-red-200 text-red-700 hover:ring-red-300"
            : "bg-white border-slate-100 text-slate-700 hover:ring-blue-200",
        "w-full min-w-[130px] max-h-[40px]"
      )}
    >
      {!isDone && task.status !== "missed" && (
        <span className={cn(
          "shrink-0 w-1.5 h-1.5 rounded-full",
          task.priority === "p1" ? "bg-red-500" : task.priority === "p2" ? "bg-amber-400" : "bg-slate-300"
        )} />
      )}
      <div className="truncate">{plainText}</div>
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
  const [previewTask, setPreviewTask] = useState<Task | null>(null);

  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const monthEnd = endOfMonth(monthStart);
  const startDate = new Date(monthStart);
  startDate.setDate(monthStart.getDate() - monthStart.getDay());
  const endDate = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Group tasks by date
  const tasksByDate: Record<string, Task[]> = {};
  for (const t of tasks) {
    if (t.taskType === "oneonone") continue;
    if (!t.date) continue;
    if (t.category !== category) continue;

    if (!tasksByDate[t.date]) tasksByDate[t.date] = [];
    tasksByDate[t.date].push(t);
  }

  // Sort tasks by priority
  const sortedTasksByPriority: Record<string, Task[]> = {};
  for (const date in tasksByDate) {
    const dayTasks = [...tasksByDate[date]].sort((a, b) => priorityRank(a) - priorityRank(b));
    sortedTasksByPriority[date] = dayTasks;
  }

  // Drag context setup with activation constraint to prevent clicks from starting drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
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

    const activeTask = tasks.find(
      (t) => t.id === active.id && t.taskType !== "oneonone"
    );
    if (!activeTask) return;

    let targetDateKey: string | null = null;
    if (over.data.current?.type === "day") {
      targetDateKey = over.data.current.dateKey;
    } else if (typeof over.id === "string") {
      const overTask = tasks.find((t) => t.id === over.id);
      if (overTask?.date) targetDateKey = overTask.date;
    }

    if (!targetDateKey || targetDateKey === activeTask.date) return;
    onUpdateTask(activeTask.id, { date: targetDateKey });
  };

  const activeTask =
  activeTaskId
    ? tasks.find(
        (t) => t.id === activeTaskId && t.taskType !== "oneonone"
      )
    : null;

  // Drag overlay component
  const dragOverlay = (
    <div className="pointer-events-none">
      {activeTask && activeTask.date && (
        <MonthTaskPill
          task={activeTask}
          dateKey={activeTask.date}
        />
      )}
    </div>
  );

  return (
    <>
      {previewTask && (
        <TaskPreviewModal
          task={previewTask}
          onClose={() => setPreviewTask(null)}
        />
      )}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
        <div className="grid grid-cols-7 auto-rows-[150px] overflow-y-auto">
          {days.map((day) => {
            const dateKey = formatDate(day, "yyyy-MM-dd");
            const dayTasks = sortedTasksByPriority[dateKey] || [];
            return (
              <DayCell
                key={dateKey}
                day={day}
                dateKey={dateKey}
                tasks={dayTasks}
                isCurrentMonth={isSameMonth(day, monthStart)}
                isTodayFlag={isTodayFn(day)}
                onDateClick={() => {}}
                onPreviewTask={setPreviewTask}
              />
            );
          })}
        </div>
    </DndContext>

      {/* DRAG PREVIEW */}
      <DragOverlay>{dragOverlay}</DragOverlay>
    </>
  );
};
