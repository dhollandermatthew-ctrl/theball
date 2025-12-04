import React, { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Check,
  X,
  HelpCircle,
  GripVertical,
  Trash2,
  Sparkles,
  Loader2,
} from "lucide-react";

import { Task, TaskStatus, TaskPriority } from "@/domain/types";
import { cn, DEFAULT_TASK_CONTENT } from "@/domain/utils";
import { RichTextRenderer } from "@/components/RichTextRenderer";
import { WysiwygEditor } from "@/components/WysiwygEditor";
import { runAI } from "@/domain/ai";
import { formatDateKey } from "@/domain/utils";

// ...

interface TaskCardProps {
  task: Task;
  onUpdateStatus: (id: string, status: TaskStatus) => void;
  onUpdatePriority: (id: string, priority: TaskPriority) => void;
  onUpdateContent: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  disableDrag?: boolean;
}

/* ---------------- STATUS ACCORDION ---------------- */
const StatusAccordion = ({
  status,
  onSelect,
}: {
  status: TaskStatus;
  onSelect: (s: TaskStatus) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectStatus = (s: TaskStatus) => {
    onSelect(status === s ? "todo" : s);
    setIsOpen(false);
  };

  const baseIcon = () => {
    switch (status) {
      case "done":
        return <Check className="w-3.5 h-3.5 text-white" />;
      case "missed":
        return <X className="w-3.5 h-3.5 text-white" />;
      case "maybe":
        return <HelpCircle className="w-3.5 h-3.5 text-amber-600" />;
      default:
        return (
          <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300" />
        );
    }
  };

  const baseStyle = () => {
    switch (status) {
      case "done":
        return "bg-green-500 border-green-600";
      case "missed":
        return "bg-red-500 border-red-600";
      case "maybe":
        return "bg-amber-100 border-amber-200";
      default:
        return "bg-transparent hover:bg-slate-100 border-transparent";
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
            onClick={(e) => {
              e.stopPropagation();
              selectStatus("done");
            }}
            className="p-1 rounded-full hover:bg-slate-100"
          >
            <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              selectStatus("missed");
            }}
            className="p-1 rounded-full hover:bg-slate-100"
          >
            <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
              <X className="w-3 h-3 text-white" />
            </div>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              selectStatus("maybe");
            }}
            className="p-1 rounded-full hover:bg-slate-100"
          >
            <HelpCircle className="w-4 h-4 text-amber-600" />
          </button>
        </div>
      ) : (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          className={cn(
            "flex items-center justify-center w-5 h-5 rounded-md cursor-pointer border transition-colors",
            baseStyle()
          )}
        >
          {baseIcon()}
        </div>
      )}
    </div>
  );
};

/* ---------------- PRIORITY ACCORDION ---------------- */
const PriorityAccordion = ({
  priority,
  onSelect,
}: {
  priority: TaskPriority;
  onSelect: (p: TaskPriority) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const labelFor = (p: TaskPriority) => {
    switch (p) {
      case "p1":
        return (
          <span className="font-bold text-red-600 text-[10px] tracking-tight">
            P1
          </span>
        );
      case "p2":
        return (
          <span className="font-bold text-amber-500 text-[10px] tracking-tight">
            P2
          </span>
        );
      case "p3":
      default:
        return (
          <span className="font-bold text-slate-400 text-[10px] tracking-tight">
            P3
          </span>
        );
    }
  };

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex items-center h-6 transition-all z-10",
        isOpen ? "w-[96px]" : "w-6"
      )}
    >
      {isOpen ? (
        <div className="absolute left-0 flex items-center gap-1 bg-white shadow-lg ring-1 ring-slate-200 rounded-full p-0.5">
          {(["p1", "p2", "p3"] as TaskPriority[]).map((p) => (
            <button
              key={p}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(p);
                setIsOpen(false);
              }}
              className={cn(
                "flex items-center justify-center w-7 h-6 rounded-full hover:bg-slate-100"
              )}
            >
              {labelFor(p)}
            </button>
          ))}
        </div>
      ) : (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
          }}
          className="flex items-center justify-center w-6 h-6 rounded-md cursor-pointer hover:bg-slate-100"
        >
          {labelFor(priority)}
        </div>
      )}
    </div>
  );
};

/* ---------------- CARD ---------------- */

const getCardStyle = (task: Task) => {
  if (task.status === "done") {
    return "bg-slate-50/60 border-slate-200";
  }

  switch (task.priority) {
    case "p1":
      return "bg-red-50/70 border-red-100 hover:border-red-200";
    case "p2":
      return "bg-amber-50/70 border-amber-100 hover:border-amber-200";
    case "p3":
    default:
      return "bg-white border-slate-200 hover:border-slate-300";
  }
};

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onUpdateStatus,
  onUpdatePriority,
  onUpdateContent,
  onDelete,
  disableDrag = false,
}) => {
  const [isEditing, setIsEditing] = useState(
    () => !task.content || task.content === DEFAULT_TASK_CONTENT
  );
  const [editValue, setEditValue] = useState(task.content);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const disableDueToState = isEditing || isAiLoading;
  const sortableDisabled = disableDrag
    ? { draggable: true, droppable: true }
    : disableDueToState;

    const {
      setNodeRef,
      listeners,
      attributes,
      transform,
      transition,
      isDragging,
    } = useSortable({
      id: task.id,
      data: {
        type: "Task",
        task,
        dateStr: task.date,   // ← THIS IS THE FIX
      },
      disabled: isEditing || isAiLoading,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const applyAI = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editValue) return;

    setIsAiLoading(true);
    try {
      const result = await runAI(editValue);
      if (result) {
        setEditValue(result);
        onUpdateContent(task.id, result);
        setEditorKey((k) => k + 1);
      }
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    if (editValue !== task.content) {
      onUpdateContent(task.id, editValue);
    }
  };

  const isCompleted = task.status === "done" || task.status === "missed";

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="opacity-40 bg-slate-50 border-2 border-slate-200 border-dashed rounded-lg h-[80px] w-full"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative flex flex-col rounded-lg border shadow-sm mb-2 hover:shadow-md transition-all",
        "active:cursor-grabbing",
        getCardStyle(task)
      )}
    >
      {/* AI overlay */}
      {isAiLoading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-white/80 backdrop-blur-[1px] rounded-lg cursor-wait">
          <div className="flex flex-col items-center gap-2 animate-pulse">
            <Sparkles className="w-6 h-6 text-purple-500 animate-spin" />
            <span className="text-xs font-medium text-purple-600">
              Improving...
            </span>
          </div>
        </div>
      )}

      {/* Drag handle */}
      <div
        {...listeners}
        {...attributes}
        className="absolute left-0 top-0 bottom-0 w-8 flex items-center justify-center cursor-grab active:cursor-grabbing hover:bg-slate-50/50 border-r border-transparent hover:border-slate-200/60 rounded-l-lg z-20"
      >
        <GripVertical
          className="text-slate-300 group-hover:text-slate-400 transition-colors"
          size={16}
        />
      </div>

      {/* Main content */}
      <div className="flex flex-col gap-1 w-full p-2 pl-10">
        {/* Header row: status + priority */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <StatusAccordion
              status={task.status}
              onSelect={(s) => onUpdateStatus(task.id, s)}
            />
            <PriorityAccordion
              priority={task.priority}
              onSelect={(p) => onUpdatePriority(task.id, p)}
            />
          </div>
        </div>

        {/* Body: title/description */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <WysiwygEditor
              key={editorKey}
              initialContent={editValue}
              onChange={setEditValue}
              onBlur={handleBlur}
              autoFocus
            />
          ) : (
            <div onClick={() => setIsEditing(true)} className="cursor-text">
              {task.content ? (
                <RichTextRenderer text={task.content} isCompleted={isCompleted} />
              ) : (
                <span className="text-slate-400 italic text-sm">
                  Empty task
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions top-right */}
      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all z-30">
        <button
          onClick={applyAI}
          disabled={isAiLoading}
          className="p-1 rounded text-slate-300 hover:text-purple-500 hover:bg-purple-50 disabled:cursor-wait"
        >
          {isAiLoading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(task.id);
          }}
          className="p-1 rounded text-slate-300 hover:text-red-400 hover:bg-red-50"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};
