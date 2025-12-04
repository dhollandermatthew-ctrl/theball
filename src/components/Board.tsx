import React, { useState, useEffect, useMemo, useRef } from "react";
import { addDays, addWeeks, addMonths, endOfMonth } from "date-fns";

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
  useDroppable,
  pointerWithin,
  CollisionDetection,
  KeyboardSensor,
  useDndMonitor,
  closestCorners,
} from "@dnd-kit/core";

import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";

import { createPortal } from "react-dom";
import {
  Inbox as InboxIcon,
  X,
  ArrowRight,
  ArrowLeft,
  MoveHorizontal,
} from "lucide-react";

import { Column } from "@/components/Column";
import { Header, ViewMode } from "@/components/Header";
import { MonthView } from "@/components/MonthView";
import { TaskCard } from "@/components/TaskCard";

import {
  Task,
  TaskStatus,
  TaskCategory,
  TaskPriority,
} from "@/domain/types";
import {
  generateId,
  formatDateKey,
  cn,
  DEFAULT_TASK_CONTENT,
} from "@/domain/utils";

const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: '0.5',
        },
      },
    }),
  };

// --------------------------------------------------------
// Props
// --------------------------------------------------------
interface BoardProps {
  tasks: Task[];
  onTasksChange: React.Dispatch<React.SetStateAction<Task[]>>;
}

// --------------------------------------------------------
// Side “push” zones (move task to prev/next week)
// --------------------------------------------------------
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
          ? "translate-x-0"
          : side === "left"
          ? "-translate-x-full"
          : "translate-x-full",
        isOver
          ? "bg-blue-100/95 border-blue-500 shadow-xl"
          : "hover:bg-slate-100/80"
      )}
    >
      <div
        className={cn(
          "flex flex-col items-center gap-2 transform transition-all duration-200 p-2 text-center pointer-events-none select-none",
          isOver
            ? "scale-110 opacity-100 text-blue-700 font-bold"
            : "opacity-60 text-slate-500 font-medium"
        )}
      >
        {side === "left" ? <ArrowLeft size={32} /> : <ArrowRight size={32} />}
        <span className="text-xs uppercase tracking-wider leading-tight whitespace-pre">
          {side === "left" ? "Move to\nPrev Week" : "Move to\nNext Week"}
        </span>
      </div>
    </div>
  );
};

// --------------------------------------------------------
// Scroll zones (scroll within current week)
// --------------------------------------------------------
const ScrollZone = ({
  side,
  active,
  isOver,
}: {
  side: "left" | "right";
  active: boolean;
  isOver: boolean;
}) => {
  const { setNodeRef } = useDroppable({
    id: `scroll-zone-${side}`,
    data: { type: "ScrollZone", side },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "fixed top-0 bottom-0 w-[80px] z-[40] flex items-center justify-center transition-opacity duration-300 pointer-events-auto",
        side === "left" ? "left-[80px]" : "right-[80px]",
        active ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <div
        className={cn(
          "absolute inset-0 transition-opacity duration-300 bg-gradient-to-r",
          side === "left"
            ? "from-slate-200/40 to-transparent"
            : "to-slate-200/40 from-transparent bg-gradient-to-l",
          isOver ? "opacity-100" : "opacity-0"
        )}
      />

      <div
        className={cn(
          "flex flex-col items-center gap-1 transition-all duration-200 z-10 p-2 rounded-lg bg-white/80 backdrop-blur-sm shadow-sm border border-slate-200/50",
          isOver ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        )}
      >
        <MoveHorizontal size={20} className="text-slate-600 animate-pulse" />
        <span className="text-[10px] font-bold uppercase text-slate-500 whitespace-nowrap">
          Scroll View
        </span>
      </div>
    </div>
  );
};

// --------------------------------------------------------
// Inbox drawer on the right
// --------------------------------------------------------
const InboxDrawer = ({
  tasks,
  isOpen,
  onClose,
  onUpdateStatus,
  onUpdatePriority,
  onUpdateContent,
  onDelete,
}: {
  tasks: Task[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateStatus: (id: string, s: TaskStatus) => void;
  onUpdatePriority: (id: string, p: TaskPriority) => void;
  onUpdateContent: (id: string, c: string) => void;
  onDelete: (id: string) => void;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: "inbox-zone",
    data: { type: "Inbox" },
  });

  return (
    <div
      className={cn(
        "fixed inset-y-0 right-0 w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-[60] border-l border-slate-200 flex flex-col",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2 text-slate-700 font-semibold">
          <InboxIcon size={18} />
          <h3>Inbox</h3>
          <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200/50"
        >
          <X size={18} />
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 overflow-y-auto p-3 transition-colors",
          isOver &&
            "bg-blue-50/50 box-border border-2 border-blue-300 border-dashed m-2 rounded-lg"
        )}
      >
        {tasks.length === 0 && !isOver && (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-center px-4">
            <InboxIcon size={32} className="mb-2 opacity-20" />
            <p className="text-sm">Drag tasks here to save them for later</p>
          </div>
        )}

        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task, index) => {
            const isCompleted =
              task.status === "done" || task.status === "missed";
            const prevTask = tasks[index - 1];
            const showSeparator =
              isCompleted &&
              (!prevTask ||
                (prevTask.status !== "done" && prevTask.status !== "missed"));

            return (
              <React.Fragment key={task.id}>
                {showSeparator && (
                  <div className="flex items-center gap-2 py-4 px-1">
                    <div className="h-px bg-slate-200 flex-1" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Completed
                    </span>
                    <div className="h-px bg-slate-200 flex-1" />
                  </div>
                )}
                <TaskCard
                  task={task}
                  onUpdateStatus={onUpdateStatus}
                  onUpdatePriority={onUpdatePriority}
                  onUpdateContent={onUpdateContent}
                  onDelete={onDelete}
                />
              </React.Fragment>
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
};

// --------------------------------------------------------
// DND monitor for scroll zones
// --------------------------------------------------------
const BoardScrollMonitor = ({
  onScrollChange,
}: {
  onScrollChange: (dir: "left" | "right" | null) => void;
}) => {
  useDndMonitor({
    onDragOver({ over }) {
      if (over?.id === "scroll-zone-left") {
        onScrollChange("left");
      } else if (over?.id === "scroll-zone-right") {
        onScrollChange("right");
      } else {
        onScrollChange(null);
      }
    },
    onDragEnd() {
      onScrollChange(null);
    },
    onDragCancel() {
      onScrollChange(null);
    },
  });

  return null;
};

// --------------------------------------------------------
// Main Board
// --------------------------------------------------------
export const Board: React.FC<BoardProps> = ({ tasks, onTasksChange }) => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [category, setCategory] = useState<TaskCategory>("work");
  const [showInbox, setShowInbox] = useState(false);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollDirection, setScrollDirection] = useState<
    "left" | "right" | null
  >(null);

  const currentWeekStart = useMemo(() => {
    const d = new Date(currentDate);
    const day = d.getDay();
    const diff = d.getDate() - day; // Sunday-start
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentDate]);

  const getPriorityWeight = (p: TaskPriority) => {
    switch (p) {
      case "p1":
        return 3;
      case "p2":
        return 2;
      case "p3":
        return 1;
      default:
        return 0;
    }
  };

  const sortTasks = (taskList: Task[]) => {
    return [...taskList].sort((a, b) => {
      const isACompleted = a.status === "done" || a.status === "missed";
      const isBCompleted = b.status === "done" || b.status === "missed";

      if (isACompleted !== isBCompleted) {
        return isACompleted ? 1 : -1;
      }

      return getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
    });
  };

  const weekDays = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  const currentWeekDateKeys = useMemo(
    () => weekDays.map((d) => formatDateKey(d)),
    [weekDays]
  );

  const weeklyStats = useMemo(() => {
    let relevantTasks: Task[] = [];

    if (viewMode === "week") {
      relevantTasks = tasks.filter(
        (t) =>
          t.category === category && currentWeekDateKeys.includes(t.date)
      );
    } else {
      const monthStart = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
      );
      const monthEnd = endOfMonth(currentDate);

      relevantTasks = tasks.filter((t) => {
        if (t.category !== category) return false;
        if (t.date === "inbox") return false;
        const d = new Date(t.date);
        return d >= monthStart && d <= monthEnd;
      });
    }

    const done = relevantTasks.filter((t) => t.status === "done").length;
    return { total: relevantTasks.length, done };
  }, [tasks, category, currentWeekDateKeys, viewMode, currentDate]);

  const inboxCount = useMemo(
    () =>
      tasks.filter(
        (t) => t.date === "inbox" && t.category === category
      ).length,
    [tasks, category]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Auto-scroll while hovering the scroll zones
  useEffect(() => {
    if (!scrollDirection) return;

    const scrollSpeed = 15;
    const interval = setInterval(() => {
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft +=
          scrollDirection === "right" ? scrollSpeed : -scrollSpeed;
      }
    }, 16);

    return () => clearInterval(interval);
  }, [scrollDirection]);

  // Custom collision handling to give priority to special zones
  const customCollisionDetection: CollisionDetection = (args) => {
    const pointerCollisions = pointerWithin(args);

    const pushZoneLeft = pointerCollisions.find(
      (c) => c.id === "side-zone-left"
    );
    const pushZoneRight = pointerCollisions.find(
      (c) => c.id === "side-zone-right"
    );
    const scrollZoneLeft = pointerCollisions.find(
      (c) => c.id === "scroll-zone-left"
    );
    const scrollZoneRight = pointerCollisions.find(
      (c) => c.id === "scroll-zone-right"
    );
    const inboxZone = pointerCollisions.find((c) => c.id === "inbox-zone");

    if (pushZoneLeft) return [pushZoneLeft];
    if (pushZoneRight) return [pushZoneRight];
    if (scrollZoneLeft) return [scrollZoneLeft];
    if (scrollZoneRight) return [scrollZoneRight];
    if (inboxZone) return [inboxZone];

    // Prefer whatever the pointer is currently over so columns register as targets
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }

    return closestCorners(args);
  };

  // ------------------------------------------------------
  // CRUD helpers
  // ------------------------------------------------------
  const handleAddTask = (dateStr: string) => {
    const newTask: Task = {
      id: generateId(),
      content: DEFAULT_TASK_CONTENT,
      date: dateStr,
      status: "todo",
      priority: "p3",
      category,
      createdAt: new Date().toISOString(),
    };

    onTasksChange((prev) => [...prev, newTask]);
    if (dateStr === "inbox") setShowInbox(true);
  };

  const handleUpdateTaskStatus = (id: string, status: TaskStatus) => {
    onTasksChange((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t))
    );
  };

  const handleUpdateTaskPriority = (id: string, priority: TaskPriority) => {
    const mapped =
      priority === "p1" || priority === "p2" || priority === "p3"
        ? priority
        : priority === "high"
        ? "p1"
        : priority === "medium"
        ? "p2"
        : "p3";

    onTasksChange((prev) =>
      prev.map((t) => (t.id === id ? { ...t, priority: mapped } : t))
    );
  };

  const handleUpdateTaskContent = (id: string, content: string) => {
    onTasksChange((prev) =>
      prev.map((t) => (t.id === id ? { ...t, content } : t))
    );
  };

  const handleDeleteTask = (id: string) => {
    onTasksChange((prev) => prev.filter((t) => t.id !== id));
  };

  const handlePrev = () => {
    setCurrentDate((prev) =>
      viewMode === "week" ? addWeeks(prev, -1) : addMonths(prev, -1)
    );
  };

  const handleNext = () => {
    setCurrentDate((prev) =>
      viewMode === "week" ? addWeeks(prev, 1) : addMonths(prev, 1)
    );
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const onDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find((t) => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const activeTaskCopy = activeTask;
    setActiveTask(null);
  
    if (!over || !activeTaskCopy) return;
  
    const activeId = active.id as string;
    const overId = over.id as string;
    const overData = over.data.current;
    const overTaskFromList = tasks.find((t) => t.id === overId);
    const isColumnId = currentWeekDateKeys.includes(overId);

    const moveTaskToDate = (dateStr: string) => {
      onTasksChange((prev) =>
        prev.map((t) => (t.id === activeId ? { ...t, date: dateStr } : t))
      );
    };

    // Debug (optional – SUPER helpful)
    console.log("onDragEnd", {
      activeId,
      overId,
      overData,
    });
  
    // -----------------------
    // 1) Side zones (prev/next week)
    // -----------------------
    if (overId === "side-zone-left") {
      const targetSunday = addWeeks(currentWeekStart, -1);
      const newDateKey = formatDateKey(targetSunday);
      onTasksChange((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, date: newDateKey } : t
        )
      );
      return;
    }
  
    if (overId === "side-zone-right") {
      const targetSunday = addWeeks(currentWeekStart, 1);
      const newDateKey = formatDateKey(targetSunday);
      onTasksChange((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, date: newDateKey } : t
        )
      );
      return;
    }
  
    // -----------------------
    // 2) Scroll zones – do nothing
    // -----------------------
    if (overId === "scroll-zone-left" || overId === "scroll-zone-right") {
      return;
    }
  
    // -----------------------
    // 3) Inbox drop
    // -----------------------
    if (overId === "inbox-zone") {
      moveTaskToDate("inbox");
      return;
    }

    // If there is no data on the droppable, bail
    if (!overData) {
      if (isColumnId) {
        moveTaskToDate(overId);
        return;
      }
      if (overTaskFromList) {
        moveTaskToDate(overTaskFromList.date);
        return;
      }
      return;
    }

    const overType = overData.type as string | undefined;

    // -----------------------
    // 4) Dropped on a COLUMN
    // -----------------------
    if (overType === "Column") {
      const targetDateStr =
        (overData.dateStr as string) || (isColumnId ? overId : null);
      if (targetDateStr) {
        moveTaskToDate(targetDateStr);
      }
      return;
    }

    // -----------------------
    // 5) Dropped on a TASK
    //    (use that task's date as target column)
    // -----------------------
    if (overType === "Task") {
      const targetTask = (overData.task as Task) ?? overTaskFromList;
      if (targetTask) {
        moveTaskToDate(targetTask.date);
      }
      return;
    }
  };

  const inboxTasks = useMemo(() => {
    const filtered = tasks.filter(
      (t) => t.date === "inbox" && t.category === category
    );
    return sortTasks(filtered);
  }, [tasks, category]);

  // ------------------------------------------------------
  // Render
  // ------------------------------------------------------
  return (
    <div className="flex flex-col h-full bg-white overflow-hidden relative">
      <Header
        currentDate={currentDate}
        viewMode={viewMode}
        category={category}
        weeklyStats={weeklyStats}
        isInboxOpen={showInbox}
        inboxCount={inboxCount}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
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
            onDateClick={(date) => {
              setCurrentDate(date);
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
            <BoardScrollMonitor onScrollChange={setScrollDirection} />

            <PushZone side="left" active={!!activeTask} />
            <PushZone side="right" active={!!activeTask} />

            <ScrollZone
              side="left"
              active={!!activeTask}
              isOver={scrollDirection === "left"}
            />
            <ScrollZone
              side="right"
              active={!!activeTask}
              isOver={scrollDirection === "right"}
            />

            <div
              ref={scrollContainerRef}
              className="flex-1 overflow-x-auto overflow-y-hidden"
            >
              <div className="flex h-full min-w-max px-4 pb-4 pl-[40px] pr-[40px]">
                {weekDays.map((day) => {
                  // debug helper
                  // @ts-ignore
                  window.lastDateKeys ??= [];
                  // @ts-ignore
                  window.lastDateKeys.push(
                    day.toISOString(),
                    formatDateKey(day)
                  );

                  const dateKey = formatDateKey(day);

                  const rawTasks = tasks.filter(
                    (t) =>
                      t.date === dateKey &&
                      t.category === category
                  );
                  const dayTasks = sortTasks(rawTasks);

                  return (
                    <Column
                      key={dateKey}
                      date={day}
                      tasks={dayTasks}
                      onAddTask={handleAddTask}
                      onUpdateTaskStatus={handleUpdateTaskStatus}
                      onUpdateTaskPriority={handleUpdateTaskPriority}
                      onUpdateTaskContent={handleUpdateTaskContent}
                      onDeleteTask={handleDeleteTask}
                    />
                  );
                })}
              </div>
            </div>

            <InboxDrawer
              isOpen={showInbox}
              tasks={inboxTasks}
              onClose={() => setShowInbox(false)}
              onUpdateStatus={handleUpdateTaskStatus}
              onUpdatePriority={handleUpdateTaskPriority}
              onUpdateContent={handleUpdateTaskContent}
              onDelete={handleDeleteTask}
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
