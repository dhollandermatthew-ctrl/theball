// FILE: src/components/TaskCard.tsx

import React, { useState, useRef, useEffect, useCallback } from "react";
import { addWeeks } from "date-fns";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import {
  Check,
  X,
  GripVertical,
  Trash2,
  Sparkles,
  Loader2,
  Star,
  ArrowRight,
  Plus,
  Link,
  Paperclip,
} from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { open as shellOpen } from "@tauri-apps/plugin-shell";

import { Task, TaskStatus, TaskPriority } from "@/domain/types";
import { cn, DEFAULT_TASK_BODY, formatDateKey } from "@/domain/utils";
import { RichTextRenderer } from "@/components/RichTextRenderer";
import { WysiwygEditor } from "@/components/WysiwygEditor";
import { runAI } from "@/domain/ai/ai";
import { useAppStore } from "@/domain/state";

/* NORMALIZE STATUS */
const normalizeStatus = (status: TaskStatus): TaskStatus =>
  status === "in_progress" ? "todo" : status;

/* --------------------------------------------------
 * CELEBRATION BURST
 * Add/remove packs below to change which moods appear.
 * -------------------------------------------------- */
const CELEBRATION_PACKS = [
  ['✨', '⭐', '💫', '✨', '⭐'],      // sparkle (calm)
  ['✨', '⭐', '💫', '✨', '⭐'],      // doubled → 2× frequency
  ['🎉', '🎊', '🎈', '✨', '⭐'],     // party
  ['🔥', '💪', '⚡', '🔥', '✨'],     // power
  ['🌟', '⭐', '💫', '🌟', '✨'],     // stars
  ['🚀', '⭐', '✨', '💫', '🌟'],     // rocket (rare)
];

const CelebrationBurst: React.FC = () => {
  const pack = CELEBRATION_PACKS[Math.floor(Math.random() * CELEBRATION_PACKS.length)];
  const particles = pack.map((emoji, i) => {
    const angle = (i / pack.length) * 360 + (Math.random() * 30 - 15);
    const dist = 38 + Math.random() * 20;
    const rad = (angle * Math.PI) / 180;
    return {
      emoji,
      tx: Math.cos(rad) * dist,
      ty: Math.sin(rad) * dist,
      delay: i * 25,
    };
  });
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ overflow: 'visible' }}>
      {particles.map(({ emoji, tx, ty, delay }, i) => (
        <div
          key={i}
          className="absolute text-sm leading-none animate-particle-fly"
          style={{ '--tx': `${tx}px`, '--ty': `${ty}px`, top: '50%', left: '50%', animationDelay: `${delay}ms` } as React.CSSProperties}
        >
          {emoji}
        </div>
      ))}
    </div>
  );
};

/* --------------------------------------------------
 * STATUS ACCORDION
 * -------------------------------------------------- */

interface StatusAccordionProps {
  status: TaskStatus;
  onSelect: (s: TaskStatus) => void;
  showMissed?: boolean;
  mode?: "accordion" | "checkbox";
}

const StatusAccordion: React.FC<StatusAccordionProps> = ({
  status,
  onSelect,
  showMissed = true,
  mode = "accordion",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const normalizedStatus =
  mode === "checkbox" && status === "missed"
    ? "todo"
    : normalizeStatus(status);

  const handleDone = (e: React.MouseEvent) => {
    e.stopPropagation();
    const goingDone = normalizedStatus !== "done";
    if (goingDone) {
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 900);
    }
    onSelect(goingDone ? "done" : "todo");
    setIsOpen(false);
  };

  // ✅ SIMPLE CHECKBOX MODE (1:1)
  if (mode === "checkbox") {
    const isDone = normalizedStatus === "done";

    return (
      <div className="relative">
        <button
          onClick={handleDone}
          className={cn(
            "w-6 h-6 flex items-center justify-center rounded-md transition",
            isDone ? "bg-green-500 text-white" : "border-2 border-slate-300 hover:bg-slate-100",
            justCompleted && "animate-check-pop"
          )}
        >
          {isDone && <Check className="w-3.5 h-3.5" />}
        </button>
        {justCompleted && (
          <div className="absolute inset-0 rounded-md bg-green-400 animate-check-ring pointer-events-none" />
        )}
        {justCompleted && <CelebrationBurst />}
      </div>
    );
  }

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
            onClick={handleDone}
          >
            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="text-white w-3 h-3" />
            </div>
          </button>

          {showMissed && (
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
          )}

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
        <div className="relative">
          <div
            className={cn(
              "flex items-center justify-center w-6 h-6 rounded-md cursor-pointer hover:bg-slate-100",
              normalizedStatus === "done" && "bg-green-500",
              normalizedStatus === "missed" && "bg-red-500",
              justCompleted && "animate-check-pop"
            )}
            onClick={() => setIsOpen(true)}
          >
            {baseIcon()}
          </div>
          {justCompleted && (
            <div className="absolute inset-0 rounded-md bg-green-400 animate-check-ring pointer-events-none" />
          )}
          {justCompleted && <CelebrationBurst />}
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

const PRIORITY_DEFS: Record<TaskPriority, { short: string; detail: string; color: string }> = {
  p1: {
    short: 'Do today',
    detail: 'Real deadline or someone waiting — OR directly compounds your capability on something active right now.',
    color: 'text-red-600',
  },
  p2: {
    short: 'Do this week',
    detail: 'Important relationship, deliverable, or project — but not time-pressured today and not tied to an active problem.',
    color: 'text-amber-500',
  },
  p3: {
    short: 'Do when ready',
    detail: 'No clock, no active relevance, no one waiting. Nothing breaks if this waits.',
    color: 'text-slate-400',
  },
};

const PriorityAccordion: React.FC<PriorityAccordionProps> = ({
  priority,
  onSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
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

  const def = PRIORITY_DEFS[priority];

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
        <div className="relative">
          <div
            className="w-6 h-6 flex items-center justify-center cursor-pointer hover:bg-slate-100 rounded-md"
            onClick={() => { setIsOpen(true); setShowTooltip(false); }}
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            {label(priority)}
          </div>
          {showTooltip && (
            <div className="absolute left-7 top-1/2 -translate-y-1/2 z-50 bg-slate-900 text-white rounded-md px-2 py-1 shadow-lg pointer-events-none whitespace-nowrap">
              <span className={cn("text-[11px] font-semibold", def.color)}>{def.short}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* --------------------------------------------------
 * LINK CHIPS (URL + File)
 * -------------------------------------------------- */
const UrlChip: React.FC<{ url: string; onOpen: () => void; onRemove: () => void }> = ({ url, onOpen, onRemove }) => {
  const display = url.replace(/^https?:\/\//, "").replace(/\/$/, "").split("/")[0];
  return (
    <span className="group/chip inline-flex items-center gap-0.5 bg-blue-50 border border-blue-200 text-blue-700 rounded px-1.5 py-0.5 text-[11px] max-w-[180px]">
      <button onClick={onOpen} className="flex items-center gap-1 max-w-[140px] min-w-0 hover:underline">
        <Link size={10} className="shrink-0" />
        <span className="truncate">{display}</span>
      </button>
      <button onClick={onRemove} className="shrink-0 ml-0.5 text-blue-300 hover:text-blue-700 opacity-0 group-hover/chip:opacity-100 transition-opacity">
        <X size={9} />
      </button>
    </span>
  );
};

const FileChip: React.FC<{ name: string; onOpen: () => void; onRemove: () => void }> = ({ name, onOpen, onRemove }) => (
  <span className="group/chip inline-flex items-center gap-0.5 bg-purple-50 border border-purple-200 text-purple-700 rounded px-1.5 py-0.5 text-[11px] max-w-[180px]">
    <button onClick={onOpen} className="flex items-center gap-1 max-w-[140px] min-w-0 hover:underline">
      <Paperclip size={10} className="shrink-0" />
      <span className="truncate">{name}</span>
    </button>
    <button onClick={onRemove} className="shrink-0 ml-0.5 text-purple-300 hover:text-purple-700 opacity-0 group-hover/chip:opacity-100 transition-opacity">
      <X size={9} />
    </button>
  </span>
);

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
  showMissedStatus?: boolean; // ✅ ADD THIS
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
  showMissedStatus = true, // ✅ default
}) => {
  const normalizedStatus = normalizeStatus(task.status);
  const starTask = useAppStore((s) => s.starTask);
  const unstarTask = useAppStore((s) => s.unstarTask);
  const updateTask = useAppStore((s) => s.updateTask);

  /* CONTEXT MENU */

  const initialBody =
    !task.content || task.content === DEFAULT_TASK_BODY
      ? DEFAULT_TASK_BODY
      : task.content;

      const [editMode, setEditMode] =
      useState<"none" | "title" | "body">("none");

  const [editValue, setEditValue] = useState(initialBody);
  const [titleValue, setTitleValue] = useState(
    task.title === "__new__" ? "" : task.title ?? ""
  );  
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [editorKey, setEditorKey] = useState(0);

  const cardDomRef = useRef<HTMLElement | null>(null);
  const [isFlashing, setIsFlashing] = useState(false);

  /* LINKS STATE */
  const [showLinksPanel, setShowLinksPanel] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [linksTab, setLinksTab] = useState<"url" | "file">("url");
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isNewTask) return;
    setEditMode("title");

    // Scroll into view and flash
    const t = setTimeout(() => {
      cardDomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setIsFlashing(true);
      setTimeout(() => setIsFlashing(false), 1400);
    }, 100);
    return () => clearTimeout(t);
  }, [isNewTask]);

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
    setTitleValue(task.title === "__new__" ? "" : task.title ?? "");
  }, [task.title]);

  useEffect(() => {
    const body =
      !task.content || task.content === DEFAULT_TASK_BODY
        ? DEFAULT_TASK_BODY
        : task.content;
    setEditValue(body);
  }, [task.content]);

  /* STAR TOGGLE */
  const handleStarToggle = () => {
    if (!task.date) return; // Only calendar tasks can be starred

    if (task.starredDate === task.date) {
      // Already starred for this day → unstar
      unstarTask(task.id);
    } else {
      // Not starred for this day → star it
      const result = starTask(task.id, task.date);
      if (!result.success && result.message) {
        alert(result.message); // Simple feedback for now
      }
    }
  };



/* Auto-focus title */
useEffect(() => {
  if (editMode === "title" && finalTitleRef.current) {
    finalTitleRef.current.focus();
    finalTitleRef.current.select();
  }
}, [editMode]);

/* Keyboard shortcut: Cmd+S to star/unstar */
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleStarToggle();
    }
  };

  window.addEventListener("keydown", handleKeyDown);
  return () => window.removeEventListener("keydown", handleKeyDown);
}, [task.id, task.date, task.starredDate]);
  
    const style: React.CSSProperties = {
      transform: CSS.Transform.toString(transform),
      transition,
    };
  
    /* LINK HANDLERS */
    const handleAddUrl = () => {
      const raw = newUrl.trim();
      if (!raw) return;
      const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
      updateTask(task.id, { urls: [...(task.urls ?? []), url] });
      setNewUrl("");
    };

    const handleRemoveUrl = (index: number) => {
      updateTask(task.id, { urls: (task.urls ?? []).filter((_, i) => i !== index) });
    };

    const handleOpenUrl = async (url: string) => {
      try { await shellOpen(url); } catch { window.open(url, "_blank"); }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setIsUploadingFile(true);
      try {
        const data = Array.from(new Uint8Array(await file.arrayBuffer()));
        const path = await invoke<string>("save_attachment", { taskId: task.id, filename: file.name, data });
        updateTask(task.id, { attachments: [...(task.attachments ?? []), { name: file.name, path }] });
      } catch (err) {
        console.error("Failed to save attachment:", err);
      } finally {
        setIsUploadingFile(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };

    const handleRemoveAttachment = (index: number) => {
      updateTask(task.id, { attachments: (task.attachments ?? []).filter((_, i) => i !== index) });
    };

    const handleOpenFile = async (path: string) => {
      try { await invoke("open_knowledge_file", { path }); } catch (err) { console.error("Failed to open file:", err); }
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
    const isStarred = task.starredDate === task.date;
  
    return (
<div
  ref={(el) => {
    setNodeRef(el);
    if (cardRef) cardRef.current = el;
    cardDomRef.current = el;
  }}
  style={style}
  className={cn(
    "group relative flex flex-col rounded-lg border shadow-sm transition-all duration-200",
    "hover:shadow-md hover:-translate-y-[1px]",
    isFlashing && "animate-task-flash",
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
        {/* Star Indicator */}
        {isStarred && task.starredRank && (
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 z-20">
            <div className={cn(
              "flex items-center justify-center w-5 h-5 bg-yellow-500 text-white text-xs font-bold rounded-full shadow-sm ring-2 ring-white transition-opacity",
              task.status === "done" && "opacity-50"
            )}>
              {task.status === "done" ? "✓" : task.starredRank}
            </div>
          </div>
        )}

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
        {!disableDrag && (
  <div
    {...listeners}
    {...attributes}
    style={{ touchAction: "none" }}
    className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-100"
  >
    <GripVertical size={14} className="text-slate-400" />
  </div>
)}
  
<StatusAccordion
  status={normalizedStatus}
  onSelect={(s) => onUpdateStatus(task.id, s)}
  showMissed={showMissedStatus}
  mode={showMissedStatus ? "accordion" : "checkbox"}
/>
  
          <PriorityAccordion
            priority={task.priority}
            onSelect={(p) => onUpdatePriority(task.id, p)}
          />
  
          {/* TITLE INPUT */}
          {editMode === "title" ? (
            <input
  ref={finalTitleRef}
  placeholder="Title"
  className={cn(
    "flex-1 font-bold bg-transparent outline-none border-b border-transparent focus:border-blue-300 placeholder:text-slate-400",
    styles.title
  )}
  value={titleValue}
  onChange={(e) => setTitleValue(e.target.value)}
  onBlur={handleTitleBlur}
  onKeyDown={(e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      commitTitle();
      setEditMode("body");
    }
  }}
/>
          ) : (
<div
  className={cn(
    "flex-1 font-bold cursor-text line-clamp-2",
    styles.title,
    !titleValue && "italic text-slate-400"
  )}
  title={titleValue}
  onClick={() => setEditMode("title")}
>
{titleValue ? titleValue : "Title"}</div>
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
) : showMissedStatus ? (
  // Calendar → keep placeholder
  <span className={cn("italic text-slate-400", styles.placeholder)}>
    Add details...
  </span>
) : (
  // 1:1 → quiet empty space
  <span className="block h-[1.25em]" />
)}
      </div>
    )}
  </div>
</div>
  
        {/* LINKS SECTION */}
        <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
        {((task.urls?.length ?? 0) > 0 || (task.attachments?.length ?? 0) > 0 || showLinksPanel) ? (
          <div
            className={cn("px-2 pb-2 flex flex-col gap-1.5", density === "dense" ? "pl-9" : "pl-10")}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Chips row */}
            {((task.urls?.length ?? 0) > 0 || (task.attachments?.length ?? 0) > 0) && (
              <div className="flex flex-wrap gap-1 items-center">
                {(task.urls ?? []).map((url, i) => (
                  <UrlChip key={`u${i}`} url={url} onOpen={() => handleOpenUrl(url)} onRemove={() => handleRemoveUrl(i)} />
                ))}
                {(task.attachments ?? []).map((att, i) => (
                  <FileChip key={`f${i}`} name={att.name} onOpen={() => handleOpenFile(att.path)} onRemove={() => handleRemoveAttachment(i)} />
                ))}
                {!showLinksPanel && (
                  <button
                    onClick={() => setShowLinksPanel(true)}
                    className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded hover:bg-slate-100 text-slate-400 hover:text-blue-500 transition-opacity"
                    title="Add link or file"
                  >
                    <Plus size={12} />
                  </button>
                )}
              </div>
            )}
            {/* Add panel */}
            {showLinksPanel && (
              <div className="flex flex-col gap-1 p-1.5 bg-slate-50 rounded border border-slate-200">
                <div className="flex items-center gap-1">
                  <button onClick={() => setLinksTab("url")} className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", linksTab === "url" ? "bg-blue-100 text-blue-700" : "text-slate-400 hover:text-slate-600")}>URL</button>
                  <button onClick={() => setLinksTab("file")} className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", linksTab === "file" ? "bg-purple-100 text-purple-700" : "text-slate-400 hover:text-slate-600")}>File</button>
                  <button onClick={() => { setShowLinksPanel(false); setNewUrl(""); }} className="ml-auto text-slate-300 hover:text-slate-500"><X size={11} /></button>
                </div>
                {linksTab === "url" ? (
                  <div className="flex gap-1">
                    <input
                      autoFocus
                      value={newUrl}
                      onChange={(e) => setNewUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddUrl(); if (e.key === "Escape") { setShowLinksPanel(false); setNewUrl(""); } }}
                      placeholder="Paste URL…"
                      className="flex-1 text-xs border border-slate-200 rounded px-1.5 py-0.5 outline-none focus:border-blue-300 bg-white"
                    />
                    <button onClick={handleAddUrl} className="text-[10px] px-2 py-0.5 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium">Add</button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()} disabled={isUploadingFile} className="text-[11px] px-2 py-1 border border-slate-200 bg-white rounded hover:bg-slate-50 text-slate-600 flex items-center gap-1 self-start">
                    <Paperclip size={11} />
                    {isUploadingFile ? "Saving…" : "Choose file…"}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* No links — show "Add link or file" on card hover */
          <div
            className={cn("px-2 pb-1.5 opacity-0 group-hover:opacity-100 transition-opacity", density === "dense" ? "pl-9" : "pl-10")}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setShowLinksPanel(true); }}
              className="text-[11px] text-slate-400 hover:text-blue-500 flex items-center gap-1 leading-none"
            >
              <Plus size={11} /> Add link or file
            </button>
          </div>
        )}

        {/* ACTIONS TOP RIGHT */}
        <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
  
          {/* STAR (only for calendar tasks) */}
          {task.date && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleStarToggle();
              }}
              className={cn(
                "p-1 rounded transition-all",
                task.starredDate === task.date
                  ? "text-yellow-500 hover:bg-yellow-50"
                  : "text-slate-300 hover:text-yellow-500 hover:bg-yellow-50"
              )}
              title={`Star for daily focus (Cmd+S) ${
                task.starredDate === task.date ? "★" : "☆"
              }`}
            >
              <Star
                size={14}
                fill={task.starredDate === task.date ? "currentColor" : "none"}
              />
            </button>
          )}

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