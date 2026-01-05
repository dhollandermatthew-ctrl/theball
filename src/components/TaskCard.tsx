// FILE: src/components/TaskCard.tsx

import React, { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  Check,
  X,
  GripVertical,
  Trash2,
  Sparkles,
  Loader2,
} from "lucide-react";

import { Task, TaskStatus, TaskPriority } from "@/domain/types";
import { cn, DEFAULT_TASK_BODY } from "@/domain/utils";
import { RichTextRenderer } from "@/components/RichTextRenderer";
import { WysiwygEditor } from "@/components/WysiwygEditor";
import { runAI } from "@/domain/ai/ai";

/* NORMALIZE STATUS */
const normalizeStatus = (status: TaskStatus): TaskStatus =>
  status === "in_progress" ? "todo" : status;

/* --------------------------------------------------
 * STATUS ACCORDION
 * -------------------------------------------------- */

interface StatusAccordionProps {
  status: TaskStatus;
  onSelect: (s: TaskStatus) => void;
}

const StatusAccordion: React.FC<StatusAccordionProps> = ({
  status,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const normalizedStatus = normalizeStatus(status);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const baseIcon = () => {
    switch (normalizedStatus) {
      case "done":
        return <Check className="w-3.5 h-3.5 text-white" />;
      case "missed":
        return <X className="w-3.5 h-3.5 text-white" />;
      default:
        return (
          <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" />
        );
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex items-center h-6 transition-all z-20",
        isOpen ? "w-[88px]" : "w-6"
      )}
    >
      {isOpen ? (
        <div className="absolute left-0 flex items-center gap-1 bg-white shadow-lg ring-1 ring-slate-200 rounded-full p-0.5">

          <button
            className="p-1 hover:bg-slate-100 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              onSelect("done");
              setIsOpen(false);
            }}
          >
            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="text-white w-3 h-3" />
            </div>
          </button>

          <button
            className="p-1 hover:bg-slate-100 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              onSelect("missed");
              setIsOpen(false);
            }}
          >
            <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
              <X className="text-white w-3 h-3" />
            </div>
          </button>

          <button
            className="p-1 hover:bg-slate-100 rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              onSelect("todo");
              setIsOpen(false);
            }}
          >
            <div className="w-4 h-4 border-2 border-slate-300 rounded-full" />
          </button>
        </div>
      ) : (
        <div
          className={cn(
            "flex items-center justify-center w-6 h-6 rounded-md cursor-pointer hover:bg-slate-100",
            normalizedStatus === "done" && "bg-green-500",
            normalizedStatus === "missed" && "bg-red-500"
          )}
          onClick={() => setIsOpen(true)}
        >
          {baseIcon()}
        </div>
      )}
    </div>
  );
};

/* --------------------------------------------------
 * PRIORITY ACCORDION
 * -------------------------------------------------- */

interface PriorityAccordionProps {
  priority: TaskPriority;
  onSelect: (p: TaskPriority) => void;
}

const PriorityAccordion: React.FC<PriorityAccordionProps> = ({
  priority,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label = (p: TaskPriority) => {
    switch (p) {
      case "p1":
        return <span className="text-[10px] font-bold text-red-600">P1</span>;
      case "p2":
        return <span className="text-[10px] font-bold text-amber-500">P2</span>;
      default:
        return <span className="text-[10px] font-bold text-slate-400">P3</span>;
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex items-center h-6 transition-all",
        isOpen ? "w-[96px]" : "w-6"
      )}
    >
      {isOpen ? (
        <div className="absolute left-0 flex items-center gap-1 bg-white shadow-lg rounded-full ring-1 ring-slate-200 p-0.5">
          {(["p1", "p2", "p3"] as TaskPriority[]).map((p) => (
            <button
              key={p}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(p);
                setIsOpen(false);
              }}
              className="w-7 h-6 hover:bg-slate-100 rounded-full flex items-center justify-center"
            >
              {label(p)}
            </button>
          ))}
        </div>
      ) : (
        <div
          className="w-6 h-6 flex items-center justify-center cursor-pointer hover:bg-slate-100 rounded-md"
          onClick={() => setIsOpen(true)}
        >
          {label(priority)}
        </div>
      )}
    </div>
  );
};

/* --------------------------------------------------
 * TASK CARD — START
 * -------------------------------------------------- */
type Density = "comfortable" | "dense";


interface TaskCardProps {
  task: Task;
  density?: Density;

  onUpdateStatus: (id: string, s: TaskStatus) => void;
  onUpdatePriority: (id: string, p: TaskPriority) => void;
  onUpdateContent: (id: string, c: string) => void;
  onUpdateTitle: (id: string, title: string) => void;
  onDelete: (id: string) => void;

  isNewTask?: boolean;
  titleRef?: React.RefObject<HTMLInputElement | null>;
  bodyRef?: React.RefObject<HTMLDivElement | null>;
  cardRef?: React.RefObject<HTMLDivElement | null>;

  disableDrag?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  density = "comfortable",
  onUpdateStatus,
  onUpdatePriority,
  onUpdateContent,
  onUpdateTitle,
  onDelete,
  isNewTask = false,
  titleRef,
  bodyRef,
  cardRef,
  disableDrag = false,
}) => {
  const normalizedStatus = normalizeStatus(task.status);

  const initialBody =
    !task.content || task.content === DEFAULT_TASK_BODY
      ? DEFAULT_TASK_BODY
      : task.content;

  const [editMode, setEditMode] =
    useState<"none" | "title" | "body">(isNewTask ? "title" : "none");

  const [editValue, setEditValue] = useState(initialBody);
  const [titleValue, setTitleValue] = useState(task.title ?? "New Task");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const {
    setNodeRef,
    listeners,
    attributes,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "Task", task, dateStr: task.date },
    disabled: editMode !== "none" || isAiLoading || disableDrag,
  });

  const internalTitleRef = useRef<HTMLInputElement | null>(null);
  const finalTitleRef = titleRef ?? internalTitleRef;

  const internalBodyRef = useRef<HTMLDivElement | null>(null);
  const finalBodyRef = bodyRef ?? internalBodyRef;

  useEffect(() => {
    setTitleValue(task.title ?? "New Task");
  }, [task.title]);

  useEffect(() => {
    const body =
      !task.content || task.content === DEFAULT_TASK_BODY
        ? DEFAULT_TASK_BODY
        : task.content;
    setEditValue(body);
  }, [task.content]);

    /* Auto-focus title */
    useEffect(() => {
      if (editMode === "title" && finalTitleRef.current) {
        finalTitleRef.current.focus();
        finalTitleRef.current.select();
      }
    }, [editMode, finalTitleRef]);
  
    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
  
    /* AI APPLY */
    const applyAI = async (e: React.MouseEvent) => {
      e.stopPropagation();
    
      setIsAiLoading(true);
      try {
        const result = await runAI({
          title: titleValue,
          content: editValue,
        });
    
        // Update local state
        setTitleValue(result.title);
        setEditValue(result.content);
    
        // Persist to store
        onUpdateTitle(task.id, result.title);
        onUpdateContent(task.id, result.content);
    
        setEditorKey((k) => k + 1);
      } finally {
        setIsAiLoading(false);
      }
    };
  
/* TITLE COMMIT (do not rely on blur timing) */
const commitTitle = () => {
  const trimmed = titleValue.trim() || "New Task";
  if (trimmed !== (task.title ?? "New Task")) {
    onUpdateTitle(task.id, trimmed);
  }
};

/* TITLE BLUR */
const handleTitleBlur = () => {
  commitTitle();
  setEditMode("none");
};
  
/* BODY BLUR */
const handleContentBlur = () => {
  commitTitle(); // 🔑 catch cases where title blur didn't fire
  if (editValue !== task.content) {
    onUpdateContent(task.id, editValue);
  }
  setEditMode("none");
};
  
    /* DRAG PLACEHOLDER WHILE DRAGGING */
    if (isDragging) {
      return (
        <div
          ref={(el) => {
            setNodeRef(el);
            if (cardRef) cardRef.current = el;
          }}
          style={style}
          className="opacity-40 bg-slate-50 border-2 border-slate-200 border-dashed rounded-lg h-[80px]"
        />
      );
    }
  
    const isCompleted = normalizedStatus !== "todo";


    const densityStyles = {
      comfortable: {
        cardGap: "mb-2",
        headerPadding: "p-2 pb-0",
        bodyPadding: "p-2 pt-1 pl-10",
        title: "text-sm leading-snug",
        body: "text-sm leading-relaxed",
        placeholder: "text-sm",
      },
      dense: {
        cardGap: "mb-1",
        headerPadding: "p-1 pb-0",
        bodyPadding: "p-1 pt-0.5 pl-9",
        title: "text-[13px] leading-tight",
        body: "text-[12px] leading-snug",
        placeholder: "text-[12px]",
      },
    };
    
    const styles = densityStyles[density];
  
    return (
<div
  ref={(el) => {
    setNodeRef(el);
    if (cardRef) cardRef.current = el;
  }}
  className={cn(
    "group relative flex flex-col rounded-lg border shadow-sm transition-all duration-200",
    "hover:shadow-md hover:-translate-y-[1px]",
    styles.cardGap,
    task.status === "done"
      ? "bg-slate-50/60 border-slate-200"
      : task.priority === "p1"
      ? "bg-red-50 border-red-200 ring-1 ring-red-100"
      : task.priority === "p2"
      ? "bg-amber-50 border-amber-200 ring-1 ring-amber-100"
      : "bg-white border-slate-200"
  )}
>
        {/* AI overlay */}
        {isAiLoading && (
          <div className="absolute inset-0 z-40 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
            <div className="flex flex-col items-center gap-2 animate-pulse">
              <Sparkles className="w-6 h-6" />
              <span className="text-xs font-medium text-purple-600">
                Improving...
              </span>
            </div>
          </div>
        )}
  
        {/* HEADER */}
        <div className={cn("flex items-center gap-2", styles.headerPadding)}>
        <div
  {...listeners}
  {...attributes}
  style={{ touchAction: "none" }}
  className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100"
>
  <GripVertical size={14} className="text-slate-400" />
</div>
  
          <StatusAccordion
            status={normalizedStatus}
            onSelect={(s) => onUpdateStatus(task.id, s)}
          />
  
          <PriorityAccordion
            priority={task.priority}
            onSelect={(p) => onUpdatePriority(task.id, p)}
          />
  
          {/* TITLE INPUT */}
          {editMode === "title" ? (
            <input
              ref={finalTitleRef}
              className={cn(
                "flex-1 font-bold bg-transparent outline-none border-b border-transparent focus:border-blue-300",
                styles.title
              )}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => {
                if (e.key === "Tab") {
                  e.preventDefault();
                  commitTitle();     // 🔑 force-save before switching modes
                  setEditMode("body");
                }
              }}
            />
          ) : (
            <div
            className={cn(
              "flex-1 font-bold truncate cursor-text",
              styles.title
            )}
              onClick={() => setEditMode("title")}
            >
              {titleValue}
            </div>
          )}
        </div>
  
        {/* BODY SECTION */}
        <div
  className={cn(
    styles.bodyPadding,
    "relative",
    editMode !== "body" && "max-h-[220px] overflow-y-auto"
  )}
>
  
  <div
    className="pr-1"
    ref={finalBodyRef}
    onPointerDown={(e) => e.stopPropagation()}
  >
    {editMode === "body" ? (
      <WysiwygEditor
        key={editorKey}
        initialContent={editValue}
        onChange={setEditValue}
        onBlur={handleContentBlur}
        autoFocus
        placeholder="Add details..."
      />
    ) : (
      <div
        className="cursor-text min-h-[1.5em]"
        onClick={() => setEditMode("body")}
      >
        {task.content ? (
          <RichTextRenderer
  text={task.content}
  isCompleted={isCompleted}
  className="text-[12px] leading-[1.25] prose prose-sm max-w-none ml-[-24px]"
/>
        ) : (
          <span className={cn("italic text-slate-400", styles.placeholder)}>
  Add details...
</span>
        )}
      </div>
    )}
  </div>

</div>
  
        {/* ACTIONS TOP RIGHT */}
        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
  
          {/* AI */}
          <button
            disabled={isAiLoading}
            onClick={applyAI}
            className="p-1 rounded hover:bg-purple-50 text-slate-300 hover:text-purple-600"
          >
            {isAiLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
          </button>
  
          {/* DELETE */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(task.id);
            }}
            className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  };