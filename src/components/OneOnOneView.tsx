import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Check,
  Square,
  Trash2,
  Calendar,
  GripVertical,
  Plus,
} from "lucide-react";

import {
  DndContext,
  closestCenter,
  DragEndEvent,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

import { OneOnOnePerson, OneOnOneItem } from "@/domain/state";
import { cn, DEFAULT_TASK_BODY } from "@/domain/utils";
import { RichTextRenderer } from "./RichTextRenderer";
import { WysiwygEditor } from "./WysiwygEditor";

import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

/* ------------------------------------------------------------------ */
/* TYPES */
/* ------------------------------------------------------------------ */

interface OneOnOneViewProps {
  person: OneOnOnePerson;
  items: OneOnOneItem[];
  onAddItem: (personId: string, content: string) => void;
  onUpdateItem: (id: string, content: string) => void;
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
  onEditPerson: (id: string, updates: Partial<OneOnOnePerson>) => void;
}

/* ------------------------------------------------------------------ */
/* VIEW */
/* ------------------------------------------------------------------ */

export const OneOnOneView: React.FC<OneOnOneViewProps> = ({
  person,
  items,
  onAddItem,
  onUpdateItem,
  onToggleItem,
  onDeleteItem,
  onEditPerson,
}) => {
  const [newItemContent, setNewItemContent] = useState(DEFAULT_TASK_BODY);
  const [editorKey, setEditorKey] = useState(0);

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(person.name);

  const [orderedItems, setOrderedItems] = useState<OneOnOneItem[]>(items);

  /**
   * 🔑 CRITICAL FIX:
   * Only reset order when the PERSON changes,
   * not on every items update (which breaks drag).
   */
  useEffect(() => {
    setOrderedItems(items);
  }, [person.id]);

  const activeItems = orderedItems.filter((i) => !i.isCompleted);
  const completedItems = orderedItems.filter((i) => i.isCompleted);

  const handleSubmitNewItem = () => {
    if (
      newItemContent.trim() &&
      newItemContent !== DEFAULT_TASK_BODY
    ) {
      onAddItem(person.id, newItemContent);
      setNewItemContent(DEFAULT_TASK_BODY);
      setEditorKey((k) => k + 1);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrderedItems((prev) => {
      const oldIndex = prev.findIndex((i) => i.id === active.id);
      const newIndex = prev.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* ---------------- HEADER ---------------- */}
      <div className="px-4 md:px-12 py-8 pb-4 max-w-4xl mx-auto w-full pt-16 md:pt-8">
        <div className="flex items-center gap-4 mb-6 group">
          <div
            className={cn(
              "w-12 h-12 md:w-16 md:h-16 rounded-lg flex items-center justify-center text-xl md:text-2xl font-bold text-white shadow-md transition-transform group-hover:scale-105 shrink-0",
              person.avatarColor
            )}
          >
            {person.name.charAt(0).toUpperCase()}
          </div>

          <div>
            {isEditingName ? (
              <input
                autoFocus
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={() => {
                  const trimmed = tempName.trim();
                  if (trimmed && trimmed !== person.name) {
                    onEditPerson(person.id, { name: trimmed });
                  }
                  setIsEditingName(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const trimmed = tempName.trim();
                    if (trimmed && trimmed !== person.name) {
                      onEditPerson(person.id, { name: trimmed });
                    }
                    setIsEditingName(false);
                  }
                  if (e.key === "Escape") {
                    setIsEditingName(false);
                    setTempName(person.name);
                  }
                }}
                className="text-2xl md:text-4xl font-bold text-slate-900 tracking-tight bg-transparent border-b border-slate-300 focus:border-blue-400 focus:outline-none px-1"
              />
            ) : (
              <h1
                className="text-2xl md:text-4xl font-bold text-slate-900 tracking-tight cursor-text hover:bg-slate-100 px-1 rounded transition"
                onClick={() => {
                  setTempName(person.name);
                  setIsEditingName(true);
                }}
              >
                {person.name}
              </h1>
            )}

            <p className="text-slate-500 mt-1 flex items-center gap-1 text-xs md:text-sm">
              <Calendar size={14} />
              <span>1:1 Discussion Notes</span>
            </p>
          </div>
        </div>

        <div className="h-px bg-slate-200 w-full mb-8" />
      </div>

      {/* ---------------- CONTENT ---------------- */}
      <div className="flex-1 overflow-y-auto px-4 md:px-12 pb-12">
        <div className="max-w-4xl mx-auto w-full space-y-8">
          {/* ACTIVE ITEMS */}
          <section>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span>To Discuss</span>
              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px]">
                {activeItems.length}
              </span>
            </h2>

            <DndContext
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={activeItems.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-1">
                  {activeItems.map((item) => (
                    <SortableEditableItem
                      key={item.id}
                      item={item}
                      onUpdate={onUpdateItem}
                      onToggle={onToggleItem}
                      onDelete={onDeleteItem}
                    />
                  ))}

                  {/* Add new item */}
                  <div className="flex items-start gap-3 py-2 px-2 text-slate-400 group focus-within:text-slate-800 transition-colors relative">
                    <Plus size={18} className="mt-1" />
                    <div className="flex-1">
                      <WysiwygEditor
                        key={editorKey}
                        initialContent={newItemContent}
                        onChange={setNewItemContent}
                        onBlur={handleSubmitNewItem}
                        placeholder="Type a topic..."
                      />
                    </div>
                  </div>
                </div>
              </SortableContext>
            </DndContext>
          </section>

          {/* COMPLETED ITEMS */}
          {completedItems.length > 0 && (
            <section className="pt-8">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <span>Discussed / Done</span>
                <div className="h-px bg-slate-200 flex-1" />
              </h2>

              <div className="space-y-1 opacity-60 hover:opacity-100 transition-opacity">
                {completedItems.map((item) => (
                  <EditableItem
                    key={item.id}
                    item={item}
                    onUpdate={onUpdateItem}
                    onToggle={onToggleItem}
                    onDelete={onDeleteItem}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* SORTABLE WRAPPER */
/* ------------------------------------------------------------------ */

const SortableEditableItem: React.FC<EditableItemProps> = (props) => {
  const { item } = props;

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <EditableItem
        {...props}
        dragHandleProps={{ attributes, listeners }}
      />
    </div>
  );
};

/* ------------------------------------------------------------------ */
/* SINGLE ITEM */
/* ------------------------------------------------------------------ */

interface EditableItemProps {
  item: OneOnOneItem;
  onUpdate: (id: string, c: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  dragHandleProps?: {
    attributes: DraggableAttributes;
    listeners: SyntheticListenerMap | undefined;
  };
}

const EditableItem: React.FC<EditableItemProps> = ({
  item,
  onUpdate,
  onToggle,
  onDelete,
  dragHandleProps,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(item.content);

  const handleBlur = () => {
    setIsEditing(false);
    if (value.trim() !== item.content) {
      onUpdate(item.id, value);
    }
  };

  return (
    <div className="group flex items-start gap-3 py-1 px-2 rounded hover:bg-slate-50 relative -ml-2">
      {/* Drag Handle */}
      <div
        {...dragHandleProps?.attributes}
        {...dragHandleProps?.listeners}
        className="absolute left-[-16px] top-1.5 p-1 text-slate-300 opacity-0 group-hover:opacity-100 cursor-grab hover:text-slate-500"
      >
        <GripVertical size={14} />
      </div>

      {/* Toggle */}
      <button
        onClick={() => onToggle(item.id)}
        className={cn(
          "mt-1 shrink-0 transition-colors",
          item.isCompleted
            ? "text-blue-500"
            : "text-slate-300 hover:text-blue-400"
        )}
      >
        {item.isCompleted ? (
          <Check size={18} strokeWidth={3} />
        ) : (
          <Square size={18} />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <WysiwygEditor
            initialContent={value}
            onChange={setValue}
            onBlur={handleBlur}
            autoFocus
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="cursor-text py-[1px]"
          >
            <RichTextRenderer
              text={item.content}
              isCompleted={item.isCompleted}
            />
          </div>
        )}
      </div>

      {/* Date */}
      <div className="text-[10px] text-slate-300 font-medium pt-1.5 select-none whitespace-nowrap hidden sm:block">
        {item.createdAt
          ? format(new Date(item.createdAt), "MMM d, h:mm a")
          : ""}
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete(item.id)}
        className="opacity-100 md:opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};