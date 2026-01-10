// FILE: src/components/Board.tsx

import React, { useState, useMemo, useRef } from "react";
import { addDays, addWeeks, addMonths } from "date-fns";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  DragStartEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
  rectIntersection,
  useDndMonitor,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { createPortal } from "react-dom";
import { ArrowRight } from "lucide-react";
import { useEffect } from "react";

import { Column } from "@/components/Column";
import { Header, ViewMode } from "@/components/Header";
import { MonthView } from "@/components/MonthView";
import { TaskCard } from "@/components/TaskCard";

import { useAppStore } from "@/domain/state";
import type { AppState } from "@/domain/state";
import type { Task } from "@/domain/state";
import { TaskStatus, TaskCategory, TaskPriority } from "@/domain/types";
import {
  generateId,
  formatDateKey,
  DEFAULT_TASK_BODY,
} from "@/domain/utils";

/* -------------------------------------------------- */
/* Constants                                          */
/* -------------------------------------------------- */

const EDGE_THRESHOLD = 120;
const MAX_SCROLL_SPEED = 26;

/* -------------------------------------------------- */
/* Drop animation                                     */
/* -------------------------------------------------- */

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: { active: { opacity: "0.4" } },
  }),
};

/* -------------------------------------------------- */
/* Move-to-Next-Week Drop Zone                        */
/* -------------------------------------------------- */

const MoveToNextWeekDropZone = ({ active }: { active: boolean }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: "move-next-week-zone",
  });

  return (
    <div
      ref={setNodeRef}
      className={[
        "fixed right-0 top-1/2 -translate-y-1/2 z-50",
        "w-[96px] h-[180px] rounded-l-xl border-2 border-dashed",
        "flex items-center justify-center text-xs font-semibold uppercase",
        "transition-all",
        active ? "opacity-100" : "opacity-0 pointer-events-none",
        isOver
          ? "bg-blue-100 border-blue-500 text-blue-700 scale-105"
          : "bg-slate-50 border-slate-300 text-slate-500",
      ].join(" ")}
    >
      <div className="flex flex-col items-center gap-2">
        <ArrowRight size={24} />
        Next Week
      </div>
    </div>
  );
};

const ScrollMonitor = ({
  scrollRef,
}: {
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) => {
  const rafRef = useRef<number | null>(null);
  const velocityRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);

  // NEW: direction + deadzone refs
  const startXRef = useRef<number | null>(null);
  const lastXRef = useRef<number | null>(null);
  const armedRef = useRef(false);

  const ARM_AFTER_MS = 120;   // prevent “pickup jump”
  const MIN_MOVE_PX = 6;      // must actually move before edge scroll engages
  const armTimeoutRef = useRef<number | null>(null);

  useDndMonitor({
    onDragStart({ activatorEvent }) {
      velocityRef.current = 0;
      lastTsRef.current = null;

      armedRef.current = false;
      startXRef.current = null;
      lastXRef.current = null;

      if (armTimeoutRef.current) window.clearTimeout(armTimeoutRef.current);
      armTimeoutRef.current = window.setTimeout(() => {
        armedRef.current = true;
      }, ARM_AFTER_MS);

      if (activatorEvent instanceof PointerEvent) {
        startXRef.current = activatorEvent.clientX;
        lastXRef.current = activatorEvent.clientX;
      }

      if (rafRef.current !== null) return;

      const tick = (ts: number) => {
        const el = scrollRef.current;
        if (!el) {
          rafRef.current = null;
          return;
        }

        if (lastTsRef.current == null) lastTsRef.current = ts;

        const deltaMs = ts - lastTsRef.current;
        lastTsRef.current = ts;

        const delta = velocityRef.current * (deltaMs / 16.67);

        if (delta !== 0) {
          const maxScroll = el.scrollWidth - el.clientWidth;
          el.scrollLeft = Math.max(0, Math.min(maxScroll, el.scrollLeft + delta));
        }

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    },

    onDragMove({ activatorEvent }) {
      const el = scrollRef.current;
      if (!el || !(activatorEvent instanceof PointerEvent)) return;

      const { clientX } = activatorEvent;
      const rect = el.getBoundingClientRect();

      // Initialize if needed
      if (lastXRef.current == null) lastXRef.current = clientX;
      if (startXRef.current == null) startXRef.current = clientX;

      const dx = clientX - lastXRef.current;
      lastXRef.current = clientX;

      // Deadzone: don’t autoscroll immediately on pickup
      const moved = Math.abs(clientX - startXRef.current) >= MIN_MOVE_PX;
      if (!armedRef.current || !moved) {
        velocityRef.current = 0;
        return;
      }

      let v = 0;

      // Only scroll LEFT if you’re moving LEFT
      if (clientX < rect.left + EDGE_THRESHOLD && dx < 0) {
        const ratio = (rect.left + EDGE_THRESHOLD - clientX) / EDGE_THRESHOLD;
        v = -MAX_SCROLL_SPEED * Math.min(1, ratio);
      }
      // Only scroll RIGHT if you’re moving RIGHT
      else if (clientX > rect.right - EDGE_THRESHOLD && dx > 0) {
        const ratio = (clientX - (rect.right - EDGE_THRESHOLD)) / EDGE_THRESHOLD;
        v = MAX_SCROLL_SPEED * Math.min(1, ratio);
      }

      velocityRef.current = v;
    },

    onDragEnd() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;

      velocityRef.current = 0;
      lastTsRef.current = null;

      if (armTimeoutRef.current) window.clearTimeout(armTimeoutRef.current);
      armTimeoutRef.current = null;

      armedRef.current = false;
      startXRef.current = null;
      lastXRef.current = null;
    },

    onDragCancel() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;

      velocityRef.current = 0;
      lastTsRef.current = null;

      if (armTimeoutRef.current) window.clearTimeout(armTimeoutRef.current);
      armTimeoutRef.current = null;

      armedRef.current = false;
      startXRef.current = null;
      lastXRef.current = null;
    },
  });

  return null;
};

    

/* -------------------------------------------------- */
/* Board                                              */
/* -------------------------------------------------- */

export const Board: React.FC = () => {
  const tasks = useAppStore((s) => s.tasks);
  const addTask = useAppStore((s: AppState) => s.addTask);
  const updateTask = useAppStore((s: AppState) => s.updateTask);
  const deleteTask = useAppStore((s: AppState) => s.deleteTask);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [category, setCategory] = useState<TaskCategory>("work");
  const [showInbox, setShowInbox] = useState(false);
  const [activeTask, setActiveTask] = useState<import("@/domain/state").Task | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [newTaskId, setNewTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (newTaskId) {
      const t = setTimeout(() => {
        setNewTaskId(null);
      }, 0);
  
      return () => clearTimeout(t);
    }
  }, [newTaskId]);

  /* ---------------- Sensors ---------------- */

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /* ---------------- Week math ---------------- */

  const weekStart = useMemo(() => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentDate]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const weekKeys = useMemo(
    () => weekDays.map((d) => formatDateKey(d)),
    [weekDays]
  );

  const weeklyTasks = tasks.filter(
    (t) =>
      t.taskType !== "oneonone" &&
      typeof t.date === "string" &&
      t.category === category &&
      weekKeys.includes(t.date)
  );
  
  const completedCount = weeklyTasks.filter(
    (t) => t.status === "done"
  ).length;
  
  const totalCount = weeklyTasks.length;

  /* ---------------- Sorting ---------------- */

  const sortTasks = (items: Task[]) => {
    const weight = (p: TaskPriority) => (p === "p1" ? 3 : p === "p2" ? 2 : 1);
    return [...items].sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "done" ? 1 : -1;
      }
      return weight(b.priority) - weight(a.priority);
    });
  };

  /* ---------------- Drag handlers ---------------- */

  const onDragStart = (e: DragStartEvent) => {
    const t = tasks.find((x) => x.id === e.active.id);
    if (t) setActiveTask(t);
  
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { over } = e;
    const task = activeTask;
  
    setActiveTask(null);
  
  
    if (!over || !task) return;
  
    const overId = String(over.id);
  
    // Drop on next week zone
    if (overId === "move-next-week-zone") {
      const today = new Date(`${task.date}T12:00:00`);
  
      const startOfThisWeek = new Date(today);
      startOfThisWeek.setDate(today.getDate() - today.getDay());
  
      const nextSunday = addWeeks(startOfThisWeek, 1);
  
      updateTask(task.id, { date: formatDateKey(nextSunday) });
      return;
    }
  
    // Dropped directly on a column
    if (weekKeys.includes(overId)) {
      updateTask(task.id, { date: overId });
      return;
    }
  
    // Dropped on top of another task → infer its column
    const overTask = tasks.find((t) => t.id === overId);
    if (overTask?.date && weekKeys.includes(overTask.date)) {
      updateTask(task.id, { date: overTask.date });
    }
  };

  /* ---------------- Render ---------------- */

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <Header
        currentDate={currentDate}
        viewMode={viewMode}
        category={category}
        weeklyStats={{
          done: completedCount,
          total: totalCount,
        }}
        isInboxOpen={showInbox}
        inboxCount={0}
        onPrev={() => setCurrentDate((d) => addWeeks(d, -1))}
        onNext={() => setCurrentDate((d) => addWeeks(d, 1))}
        onToday={() => setCurrentDate(new Date())}
        onViewModeChange={setViewMode}
        onCategoryChange={setCategory}
        onToggleInbox={() => setShowInbox(!showInbox)}
      />

      {viewMode === "month" ? (
        <MonthView
  currentDate={currentDate}
  tasks={tasks.filter((t) => t.taskType !== "oneonone")}
  category={category}
  onUpdateTask={(id, updates) => updateTask(id, updates)}
  onDateClick={(d) => {
    setCurrentDate(d);
    setViewMode("week");
  }}
/>
      ) : (
        <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        autoScroll={false}
        >
          <ScrollMonitor scrollRef={scrollRef} />
          <MoveToNextWeekDropZone active={!!activeTask} />

          <div
  ref={scrollRef}
  className="flex-1 overflow-x-auto overflow-y-hidden touch-pan-y"
>
            <div className="flex min-w-max gap-4 px-6 pb-4 h-full items-stretch">
            <SortableContext
  items={weeklyTasks.map((t) => t.id)}
  strategy={verticalListSortingStrategy}
>
                {weekDays.map((day) => {
                  const key = formatDateKey(day);
                  const dayTasks = sortTasks(
                    tasks.filter(
                      (t) =>
                        t.taskType !== "oneonone" &&
                        typeof t.date === "string" &&
                        t.date === key &&
                        t.category === category
                    )
                  );

                  return (
<Column
  key={key}
  date={day}
  tasks={dayTasks}
  category={category}
  newTaskId={newTaskId}   // ✅ ADD THIS
  onAddTask={(date) => {
    const id = generateId();
    addTask({
      id,
      title: "New Task",
      content: DEFAULT_TASK_BODY,
      date,
      taskType: "calendar",
      status: "todo",
      priority: "p3",
      category,
      createdAt: new Date().toISOString(),
    });
    setNewTaskId(id);
  }}
  onUpdateTaskStatus={(id, s) => updateTask(id, { status: s })}
  onUpdateTaskPriority={(id, p) => updateTask(id, { priority: p })}
  onUpdateTaskContent={(id, c) => updateTask(id, { content: c })}
  onUpdateTaskTitle={(id, t) => updateTask(id, { title: t })}
  onDeleteTask={deleteTask}
/>
                  );
                })}
              </SortableContext>
            </div>
          </div>

          {createPortal(
            <DragOverlay dropAnimation={dropAnimation}>
              {activeTask && (
                <div className="w-[320px]">
                  <TaskCard
  task={activeTask}
  disableDrag
  onUpdateStatus={() => {}}
  onUpdatePriority={() => {}}
  onUpdateContent={() => {}}
  onUpdateTitle={() => {}}
  onDelete={() => {}}
/>
                </div>
              )}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      )}
    </div>
  );
};