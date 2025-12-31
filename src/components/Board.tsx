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
  pointerWithin,
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

import { Column } from "@/components/Column";
import { Header, ViewMode } from "@/components/Header";
import { MonthView } from "@/components/MonthView";
import { TaskCard } from "@/components/TaskCard";

import { useAppStore } from "@/domain/state";
import type { AppState } from "@/domain/state";
import { Task, TaskStatus, TaskCategory, TaskPriority } from "@/domain/types";
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

  useDndMonitor({
    onDragStart() {
      if (rafRef.current !== null) return;

      const tick = (ts: number) => {
        const el = scrollRef.current;
        if (!el) {
          rafRef.current = null;
          return;
        }

        if (lastTsRef.current == null) {
          lastTsRef.current = ts;
        }

        const deltaMs = ts - lastTsRef.current;
        lastTsRef.current = ts;

        const delta = velocityRef.current * (deltaMs / 16.67);

        if (delta !== 0) {
          const maxScroll = el.scrollWidth - el.clientWidth;
          const next = Math.max(
            0,
            Math.min(maxScroll, el.scrollLeft + delta)
          );
          el.scrollLeft = next;
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

      let v = 0;

      if (clientX < rect.left + EDGE_THRESHOLD) {
        const ratio =
          (rect.left + EDGE_THRESHOLD - clientX) / EDGE_THRESHOLD;
        v = -MAX_SCROLL_SPEED * Math.min(1, ratio);
      } else if (clientX > rect.right - EDGE_THRESHOLD) {
        const ratio =
          (clientX - (rect.right - EDGE_THRESHOLD)) / EDGE_THRESHOLD;
        v = MAX_SCROLL_SPEED * Math.min(1, ratio);
      }

      velocityRef.current = v;
    },

    onDragEnd() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      velocityRef.current = 0;
      lastTsRef.current = null;
    },

    onDragCancel() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      velocityRef.current = 0;
      lastTsRef.current = null;
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
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [newTaskId, setNewTaskId] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);

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
    const { active, over } = e;
    const task = activeTask;

    setActiveTask(null);

    if (!over || !task) return;

    const overId = over.id as string;

    if (overId === "move-next-week-zone") {
      const today = new Date(`${task.date}T12:00:00`);
    
      // Start of THIS week (Sunday)
      const startOfThisWeek = new Date(today);
      startOfThisWeek.setDate(today.getDate() - today.getDay());
    
      // Sunday of NEXT week
      const nextSunday = addWeeks(startOfThisWeek, 1);
    
      updateTask(task.id, { date: formatDateKey(nextSunday) });
      return;
    }

    if (weekKeys.includes(overId)) {
      updateTask(task.id, { date: overId });
    }
  };

  /* ---------------- Render ---------------- */

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <Header
        currentDate={currentDate}
        viewMode={viewMode}
        category={category}
        weeklyStats={{ done: 0, total: 0 }}
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
          tasks={tasks}
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
          collisionDetection={pointerWithin}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          autoScroll={false}
        >
          <ScrollMonitor scrollRef={scrollRef} />
          <MoveToNextWeekDropZone active={!!activeTask} />

          <div
            ref={scrollRef}
            className="flex-1 overflow-x-auto overflow-y-hidden"
          >
            <div className="flex min-w-max gap-4 px-6 pb-4 h-full items-stretch">
              <SortableContext
                items={tasks.map((t) => t.id)}
                strategy={verticalListSortingStrategy}
              >
                {weekDays.map((day) => {
                  const key = formatDateKey(day);
                  const dayTasks = sortTasks(
                    tasks.filter(
                      (t) => t.date === key && t.category === category
                    )
                  );

                  return (
                    <Column
                      key={key}
                      date={day}
                      tasks={dayTasks}
                      category={category}
                      newTaskId={newTaskId}
                      onAddTask={(date) => {
                        const id = generateId();
                        addTask({
                          id,
                          title: "New Task",
                          content: DEFAULT_TASK_BODY,
                          date,
                          status: "todo",
                          priority: "p3",
                          category,
                          createdAt: new Date().toISOString(),
                        });
                        setNewTaskId(id);
                      }}
                      onUpdateTaskStatus={(id, s) =>
                        updateTask(id, { status: s })
                      }
                      onUpdateTaskPriority={(id, p) =>
                        updateTask(id, { priority: p })
                      }
                      onUpdateTaskContent={(id, c) =>
                        updateTask(id, { content: c })
                      }
                      onUpdateTaskTitle={(id, t) =>
                        updateTask(id, { title: t })
                      }
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