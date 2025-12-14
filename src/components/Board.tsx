  // FILE: src/components/Board.tsx

  import React, { useState, useEffect, useMemo, useRef } from "react";
  import { startOfWeek, addDays, addWeeks, addMonths } from "date-fns";


  import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    DragStartEvent,
    DragEndEvent,
    defaultDropAnimationSideEffects,
    DropAnimation,
    pointerWithin,
    KeyboardSensor,
    useDroppable,
    useDndMonitor,
    CollisionDetection,
  } from "@dnd-kit/core";

  import {
    SortableContext,
    verticalListSortingStrategy,
    sortableKeyboardCoordinates,
  } from "@dnd-kit/sortable";

  import { createPortal } from "react-dom";
  import {
    Inbox as InboxIcon,
    X,
    ArrowLeft,
    ArrowRight,
    MoveHorizontal,
  } from "lucide-react";

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
    cn,
    DEFAULT_TASK_BODY,
  } from "@/domain/utils";

  /* --------------------------------------------------------
  * Drag overlay animation
  * ------------------------------------------------------ */
  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: { active: { opacity: "0.5" } },
    }),
  };

  /* --------------------------------------------------------
  * Collision detection
  * ------------------------------------------------------ */
  const customCollisionDetection: CollisionDetection = (args) =>
    pointerWithin(args);

  /* --------------------------------------------------------
  * Side push zones (DROP to move week)
  * - Keep as the outer-most rails (furthest left/right)
  * - Hover can optionally advance view after dwell time (NO task mutation)
  * ------------------------------------------------------ */
  const PushZone = ({
    side,
    active,
  }: {
    side: "left" | "right";
    active: boolean;
  }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `side-zone-${side}`,
      data: { type: "SideZone", side },
    });

    return (
      <div
        ref={setNodeRef}
        className={cn(
          "fixed top-0 bottom-0 w-[80px] z-[50] flex items-center justify-center transition-all duration-300 border-dashed border-slate-300 bg-slate-50/50 backdrop-blur-sm",
          side === "left" ? "left-0 border-r-2" : "right-0 border-l-2",
          active
            ? "translate-x-0 opacity-100"
            : side === "left"
            ? "-translate-x-full opacity-0"
            : "translate-x-full opacity-0",
          isOver
            ? "bg-blue-100/95 border-blue-500 shadow-xl"
            : "hover:bg-slate-100/80"
        )}
      >
        <div
          className={cn(
            "flex flex-col items-center gap-2 p-2 text-center pointer-events-none select-none transition-all",
            isOver ? "scale-110 opacity-100 text-blue-700" : "opacity-60 text-slate-500"
          )}
        >
          {side === "left" ? <ArrowLeft size={32} /> : <ArrowRight size={32} />}
          <span className="text-xs uppercase whitespace-pre">
            {side === "left" ? "Drop →\nPrev Week" : "Drop →\nNext Week"}
          </span>
          <span className="text-[10px] font-semibold uppercase text-slate-400 whitespace-pre">
            Hold to preview
          </span>
        </div>
      </div>
    );
  };

  /* --------------------------------------------------------
  * Scroll zones (HOLD to scroll within week)
  * - Positioned just inside PushZones
  * ------------------------------------------------------ */
  const ScrollZone = ({
    side,
    active,
  }: {
    side: "left" | "right";
    active: boolean;
  }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: `scroll-zone-${side}`,
      data: { type: "ScrollZone", side },
    });

    return (
      <div
        ref={setNodeRef}
        className={cn(
          "fixed top-0 bottom-0 w-[56px] z-[40] flex items-center justify-center transition-opacity",
          side === "left" ? "left-[80px]" : "right-[80px]",
          active ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div
          className={cn(
            "flex flex-col items-center gap-1 px-2 py-3 bg-white/90 backdrop-blur-sm rounded-full shadow-sm border border-slate-200/70 transition-all",
            isOver ? "opacity-100 translate-y-0" : "opacity-30 translate-y-2"
          )}
        >
          <MoveHorizontal size={18} className="text-slate-500" />
          <span className="text-[9px] font-semibold uppercase text-slate-500 text-center leading-tight">
            Hold
            <br />
            Scroll
          </span>
        </div>
      </div>
    );
  };

  /* --------------------------------------------------------
  * Inbox drawer
  * ------------------------------------------------------ */
  const InboxDrawer = ({
    tasks,
    isOpen,
    onClose,
    onUpdateStatus,
    onUpdatePriority,
    onUpdateContent,
    onUpdateTitle,
    onDelete,
  }: {
    tasks: Task[];
    isOpen: boolean;
    onClose: () => void;
    onUpdateStatus: (id: string, s: TaskStatus) => void;
    onUpdatePriority: (id: string, p: TaskPriority) => void;
    onUpdateContent: (id: string, c: string) => void;
    onUpdateTitle: (id: string, title: string) => void;
    onDelete: (id: string) => void;
  }) => {
    const { setNodeRef, isOver } = useDroppable({
      id: "inbox-zone",
      data: { type: "Inbox" },
    });

    return (
      <div
        className={cn(
          "fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-[60] border-l border-slate-200 flex flex-col transform transition-transform",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex items-center justify-between p-4 border-b bg-slate-50/50">
          <div className="flex items-center gap-2 font-semibold text-slate-700">
            <InboxIcon size={18} />
            <h3>Inbox</h3>
            <span className="px-2 py-0.5 text-xs rounded-full bg-slate-200 text-slate-600">
              {tasks.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50"
          >
            <X size={18} />
          </button>
        </div>

        <div
          ref={setNodeRef}
          className={cn(
            "flex-1 overflow-y-auto p-3 transition-colors",
            isOver && "bg-blue-50/50 border-2 border-blue-300 border-dashed rounded-lg"
          )}
        >
          <SortableContext
            items={tasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onUpdateStatus={onUpdateStatus}
                onUpdatePriority={onUpdatePriority}
                onUpdateContent={onUpdateContent}
                onUpdateTitle={onUpdateTitle}
                onDelete={onDelete}
              />
            ))}
          </SortableContext>
        </div>
      </div>
    );
  };

  /* --------------------------------------------------------
  * DnD Monitor Bridge
  * - Tracks which rail is being hovered
  * ------------------------------------------------------ */
  const DndMonitorBridge = ({
    setSidePushDirection,
    setScrollDirection,
  }: {
    setSidePushDirection: React.Dispatch<
      React.SetStateAction<"left" | "right" | null>
    >;
    setScrollDirection: React.Dispatch<
      React.SetStateAction<"left" | "right" | null>
    >;
  }) => {
    useDndMonitor({
      onDragOver({ over }) {
        const id = over?.id;

        if (id === "side-zone-left" || id === "side-zone-right") {
          setSidePushDirection(id === "side-zone-left" ? "left" : "right");
          setScrollDirection(null);
          return;
        }

        if (id === "scroll-zone-left" || id === "scroll-zone-right") {
          setScrollDirection(id === "scroll-zone-left" ? "left" : "right");
          setSidePushDirection(null);
          return;
        }

        setSidePushDirection(null);
        setScrollDirection(null);
      },
      onDragEnd() {
        setSidePushDirection(null);
        setScrollDirection(null);
      },
      onDragCancel() {
        setSidePushDirection(null);
        setScrollDirection(null);
      },
    });

    return null;
  };

  /* --------------------------------------------------------
  * MAIN BOARD COMPONENT (NO PROPS)
  * ------------------------------------------------------ */
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
    const [sidePushDirection, setSidePushDirection] = useState<
      "left" | "right" | null
    >(null);
    const [scrollDirection, setScrollDirection] = useState<
      "left" | "right" | null
    >(null);

    const [newTaskId, setNewTaskId] = useState<string | null>(null);

    const scrollContainerRef = useRef<HTMLDivElement | null>(null);

    /* ------------------------------------------------------
    * Sensors
    * ------------------------------------------------------ */
    const sensors = useSensors(
      useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
      useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    /* ------------------------------------------------------
    * Week calculations
    * ------------------------------------------------------ */
    const weekStart = useMemo(() => {
      const d = new Date(currentDate);
      const day = d.getDay();
      d.setDate(d.getDate() - day);
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

    /* ------------------------------------------------------
    * Weekly stats (FIXED: must return { total, done })
    * ------------------------------------------------------ */
    const weeklyStats = useMemo(() => {
      const weekTasks = tasks.filter(
        (t) => weekKeys.includes(t.date) && t.category === category
      );
      const done = weekTasks.filter((t) => t.status === "done").length;
      return { done, total: weekTasks.length };
    }, [tasks, weekKeys, category]);

    /* ------------------------------------------------------
    * Sort + Inbox
    * ------------------------------------------------------ */
    const sortTasks = (items: Task[]) => {
      const weight = (p: TaskPriority) => (p === "p1" ? 3 : p === "p2" ? 2 : 1);
      return [...items].sort((a, b) => {
        const da = a.status === "done" || a.status === "missed";
        const db = b.status === "done" || b.status === "missed";
        if (da !== db) return da ? 1 : -1;
        return weight(b.priority) - weight(a.priority);
      });
    };

    const inboxTasks = useMemo(
      () =>
        sortTasks(
          tasks.filter((t) => t.date === "inbox" && t.category === category)
        ),
      [tasks, category]
    );

    /* ------------------------------------------------------
    * HOLD on SideZone → Preview week (NO task mutation)
    * This replaces the old interval that was changing task.date
    * and causing the "skipping ahead" bug.
    * ------------------------------------------------------ */
    const holdNavTimerRef = useRef<number | null>(null);

    useEffect(() => {
      if (!activeTask || !sidePushDirection) {
        if (holdNavTimerRef.current) {
          window.clearTimeout(holdNavTimerRef.current);
          holdNavTimerRef.current = null;
        }
        return;
      }

      // dwell time before switching the visible week while dragging
      const DWELL_MS = 550;

      if (holdNavTimerRef.current) window.clearTimeout(holdNavTimerRef.current);

      holdNavTimerRef.current = window.setTimeout(() => {
        setCurrentDate((prev) =>
          addWeeks(prev, sidePushDirection === "left" ? -1 : 1)
        );
        holdNavTimerRef.current = null;
      }, DWELL_MS);

      return () => {
        if (holdNavTimerRef.current) {
          window.clearTimeout(holdNavTimerRef.current);
          holdNavTimerRef.current = null;
        }
      };
    }, [activeTask, sidePushDirection]);

    /* ------------------------------------------------------
    * Continuous scroll rails
    * ------------------------------------------------------ */
    useEffect(() => {
      if (!scrollDirection) return;
      const el = scrollContainerRef.current;
      if (!el) return;

      const step = 24;
      const interval = setInterval(() => {
        el.scrollLeft += scrollDirection === "left" ? -step : step;
      }, 16);

      return () => clearInterval(interval);
    }, [scrollDirection]);

    /* ------------------------------------------------------
    * CRUD
    * ------------------------------------------------------ */
    const addNewTask = (dateStr: string) => {
      const id = generateId();
      const newTask: Task = {
        id,
        title: "New Task",
        content: DEFAULT_TASK_BODY,
        date: dateStr,
        status: "todo",
        priority: "p3",
        category,
        createdAt: new Date().toISOString(),
      };

      addTask(newTask);
      setNewTaskId(id);

      if (dateStr === "inbox") setShowInbox(true);
    };

    const updateStatus = (id: string, s: TaskStatus) =>
      updateTask(id, { status: s });

    const updatePriority = (id: string, p: TaskPriority) =>
      updateTask(id, { priority: p });

    const updateContent = (id: string, c: string) =>
      updateTask(id, { content: c });

    const updateTitle = (id: string, t: string) => updateTask(id, { title: t });

    /* ------------------------------------------------------
    * Navigation
    * ------------------------------------------------------ */
    const goPrev = () =>
      setCurrentDate((d) =>
        viewMode === "week" ? addWeeks(d, -1) : addMonths(d, -1)
      );

    const goNext = () =>
      setCurrentDate((d) =>
        viewMode === "week" ? addWeeks(d, 1) : addMonths(d, 1)
      );

    const goToday = () => setCurrentDate(new Date());

    /* ------------------------------------------------------
    * Drag logic
    * ------------------------------------------------------ */
    const onDragStart = (e: DragStartEvent) => {
      const t = tasks.find((x) => x.id === e.active.id);
      if (t) setActiveTask(t);
    };

    const onDragEnd = (e: DragEndEvent) => {
      const { active, over } = e;
      const task = activeTask;
      setActiveTask(null);
      setSidePushDirection(null);
      setScrollDirection(null);

      if (!over || !task) return;

      const activeId = active.id as string;
      const overId = over.id as string;
      const overData = over.data.current;
      const overTask = tasks.find((t) => t.id === overId);
      const isColumnId = weekKeys.includes(overId);

      const move = (dateStr: string) => updateTask(activeId, { date: dateStr });

// DROP → prev/next week (ALWAYS Sunday of target week)
if (overId === "side-zone-left" || overId === "side-zone-right") {
  const direction = overId === "side-zone-left" ? -1 : 1;

  // Parse date safely (avoid timezone drift)
  const taskDate = new Date(`${task.date}T12:00:00`);

  // Get Sunday of the task's week
  const currentWeekSunday = startOfWeek(taskDate, {
    weekStartsOn: 0, // Sunday
  });

  // Move to Sunday of prev/next week
  const targetSunday = addWeeks(currentWeekSunday, direction);

  updateTask(activeId, {
    date: formatDateKey(targetSunday),
  });

  return; // ❗ do NOT change currentDate
}

      // Scroll zones are HOLD ONLY (no drop action)
      if (overId === "scroll-zone-left" || overId === "scroll-zone-right") return;

      if (overId === "inbox-zone") {
        move("inbox");
        return;
      }

      if (!overData) {
        if (isColumnId) move(overId);
        else if (overTask) move(overTask.date);
        return;
      }

      if (overData.type === "Column") {
        move(overData.dateStr);
        return;
      }

      if (overData.type === "Task") {
        move(overData.task.date);
        return;
      }
    };

    /* ------------------------------------------------------
    * Auto-scroll to new task (fixed)
    * ------------------------------------------------------ */
    useEffect(() => {
      if (!newTaskId) return;
      if (viewMode !== "week") return;

      const newTask = tasks.find((t) => t.id === newTaskId);
      if (!newTask) return;
      if (newTask.date === "inbox") return;

      const container = scrollContainerRef.current;
      if (!container) return;

      const colIndex = weekKeys.indexOf(newTask.date);
      if (colIndex === -1) return;

      const inner = container.firstElementChild as HTMLElement | null;
      if (!inner) return;

      const columnEl = inner.children[colIndex] as HTMLElement | null;
      if (!columnEl) return;

      const targetLeft = Math.max(columnEl.offsetLeft - 40, 0);

      container.scrollTo({
        left: targetLeft,
        behavior: "smooth",
      });

      setNewTaskId(null);
    }, [newTaskId, viewMode, weekKeys, tasks]);

    /* ------------------------------------------------------
    * RENDER
    * ------------------------------------------------------ */
    return (
      <div className="flex flex-col h-full bg-white overflow-hidden relative">
        <Header
          currentDate={currentDate}
          viewMode={viewMode}
          category={category}
          weeklyStats={weeklyStats}
          isInboxOpen={showInbox}
          inboxCount={inboxTasks.length}
          onPrev={goPrev}
          onNext={goNext}
          onToday={goToday}
          onViewModeChange={setViewMode}
          onCategoryChange={setCategory}
          onToggleInbox={() => setShowInbox(!showInbox)}
        />

        <div className="flex-1 relative flex flex-col overflow-hidden">
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
              collisionDetection={customCollisionDetection}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              autoScroll={false}
            >
              <DndMonitorBridge
                setSidePushDirection={setSidePushDirection}
                setScrollDirection={setScrollDirection}
              />

              {/* INNER = hold-to-scroll */}
              <ScrollZone side="left" active={!!activeTask} />
              <ScrollZone side="right" active={!!activeTask} />

              {/* OUTER = drop-to-next/prev week */}
              <PushZone side="left" active={!!activeTask} />
              <PushZone side="right" active={!!activeTask} />

              <div
                ref={scrollContainerRef}
                className="week-scroll-container flex-1 overflow-x-auto overflow-y-hidden"
              >
                <div className="flex h-full min-w-max px-4 pb-4 pl-[40px] pr-[40px]">
                  {weekDays.map((day) => {
                    const key = formatDateKey(day);
                    const dayTasks = sortTasks(
                      tasks.filter((t) => t.date === key && t.category === category)
                    );

                    return (
                      <Column
                        key={key}
                        date={day}
                        tasks={dayTasks}
                        newTaskId={newTaskId}
                        onAddTask={addNewTask}
                        onUpdateTaskStatus={updateStatus}
                        onUpdateTaskPriority={updatePriority}
                        onUpdateTaskContent={updateContent}
                        onUpdateTaskTitle={updateTitle}
                        onDeleteTask={deleteTask}
                      />
                    );
                  })}
                </div>
              </div>

              <InboxDrawer
                isOpen={showInbox}
                tasks={inboxTasks}
                onClose={() => setShowInbox(false)}
                onUpdateStatus={updateStatus}
                onUpdatePriority={updatePriority}
                onUpdateContent={updateContent}
                onUpdateTitle={updateTitle}
                onDelete={deleteTask}
              />

              {createPortal(
                <DragOverlay dropAnimation={dropAnimation}>
                  {activeTask && (
                    <div className="w-[320px]">
                      <TaskCard
                        task={activeTask}
                        onUpdateStatus={() => {}}
                        onUpdatePriority={() => {}}
                        onUpdateContent={() => {}}
                        onUpdateTitle={() => {}}
                        onDelete={() => {}}
                        disableDrag
                      />
                    </div>
                  )}
                </DragOverlay>,
                document.body
              )}
            </DndContext>
          )}
        </div>
      </div>
    );
  };