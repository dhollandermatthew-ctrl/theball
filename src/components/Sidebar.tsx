// FILE: src/components/Sidebar.tsx
import React, { useState } from "react";
import {
  Calendar,
  Plus,
  Trash2,
  Search,
  X,
  ZoomIn,
  ZoomOut,
  GripVertical,
  Pencil,
  Target,
} from "lucide-react";

import { OneOnOnePerson } from "@/domain/state";
import { cn } from "@/domain/utils";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import AppIcon from "../assets/icon.png";

/* -----------------------------------------------------
   Sidebar Props (FIXED)
----------------------------------------------------- */
interface SidebarProps {
  currentView: string;
  people: OneOnOnePerson[];
  onNavigate: (id: string) => void;
  onAddPerson: (name: string) => void;
  onDeletePerson: (id: string) => void;
  onEditPerson: (id: string, updates: Partial<OneOnOnePerson>) => void;
  onReorderPeople: (newOrder: string[]) => void;
  getNoteCount: (id: string) => number;
  onSearchClick: () => void;

  isOpen: boolean;
  onClose: () => void;
  width?: number;
  onResizeStart?: (e: React.MouseEvent) => void;

  zoomLevel: number;
  onZoomChange: (level: number) => void;
}

/* -----------------------------------------------------
   Confirm Modal
----------------------------------------------------- */
const ConfirmDeleteModal = ({
  open,
  onCancel,
  onConfirm,
  personName,
  noteCount,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  personName: string;
  noteCount: number;
}) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-6 w-[320px]">
        <h2 className="text-lg font-semibold text-slate-800">
          Delete this 1:1?
        </h2>

        <p className="text-sm text-slate-600 mt-2">
          <strong>{personName}</strong> has{" "}
          <strong>{noteCount}</strong> note{noteCount === 1 ? "" : "s"}.
        </p>

        <p className="text-sm text-slate-600 mt-1">
          If you delete this 1:1, the notes will be permanently removed.
        </p>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-sm rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-sm rounded-md bg-red-600 text-white hover:bg-red-700"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

/* -----------------------------------------------------
   Sortable Row
----------------------------------------------------- */
interface SortablePersonProps {
  person: OneOnOnePerson;
  isActive: boolean;
  isEditing: boolean;
  editingName: string;
  onNavigate: () => void;
  onStartEdit: () => void;
  onEditNameChange: (value: string) => void;
  onEditSave: () => void;
  onDelete: () => void;
}

const SortablePersonRow: React.FC<SortablePersonProps> = ({
  person,
  isActive,
  isEditing,
  editingName,
  onNavigate,
  onStartEdit,
  onEditNameChange,
  onEditSave,
  onDelete,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: person.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <button
        type="button"
        onClick={() => !isEditing && onNavigate()}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors text-left",
          isActive
            ? "bg-white text-slate-900 shadow-sm border border-slate-200"
            : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
        )}
      >
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center justify-center cursor-grab active:cursor-grabbing text-slate-300 group-hover:text-slate-500"
        >
          <GripVertical size={14} />
        </span>

        {/* Avatar */}
        <div
          className={cn(
            "w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white",
            person.avatarColor
          )}
        >
          {person.name.charAt(0).toUpperCase()}
        </div>

        {/* Name / edit input */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              autoFocus
              type="text"
              value={editingName}
              onChange={(e) => onEditNameChange(e.target.value)}
              onBlur={onEditSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  onEditSave();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  onEditSave();
                }
              }}
              className="w-full bg-transparent border-b border-slate-300 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
            />
          ) : (
            <span className="truncate">{person.name}</span>
          )}
        </div>
      </button>

      {/* Edit / Delete */}
      <div className="absolute right-2 top-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onStartEdit();
          }}
          className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded"
        >
          <Pencil size={12} />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-100 rounded"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
};

/* -----------------------------------------------------
   Main Sidebar Component
----------------------------------------------------- */
export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  people,
  onNavigate,
  onAddPerson,
  onDeletePerson,
  onEditPerson,
  onReorderPeople,
  getNoteCount,
  onSearchClick,
  isOpen,
  onClose,
  width = 256,
  onResizeStart,
  zoomLevel,
  onZoomChange,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<OneOnOnePerson | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  /* ---------------------- Create person ---------------------- */
  const handleAddSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;

    onAddPerson(trimmed);
    setNewName("");
    setIsAdding(false);
  };

  /* ---------------------- Editing ---------------------- */
  const startEditPerson = (p: OneOnOnePerson) => {
    setEditingId(p.id);
    setEditingName(p.name);
  };

  const saveEditPerson = () => {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (trimmed.length > 0) onEditPerson(editingId, { name: trimmed });
    setEditingId(null);
    setEditingName("");
  };

  /* ---------------------- Delete Logic ---------------------- */
  const handleDeletePerson = (person: OneOnOnePerson) => {
    const notes = getNoteCount(person.id);
    if (notes === 0) {
      onDeletePerson(person.id);
      return;
    }
    setPendingDelete(person);
    setModalOpen(true);
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    onDeletePerson(pendingDelete.id);
    setPendingDelete(null);
    setModalOpen(false);
  };

  const cancelDelete = () => {
    setPendingDelete(null);
    setModalOpen(false);
  };

  /* ---------------------- Drag & Drop ---------------------- */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = people.findIndex((p) => p.id === active.id);
    const newIndex = people.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(people, oldIndex, newIndex).map((p) => p.id);
    onReorderPeople(newOrder);
  };

  /* ---------------------- Zoom ---------------------- */
  const handleZoom = (d: number) => {
    const newLevel = Math.min(Math.max(zoomLevel + d, 0.7), 1.5);
    onZoomChange(Number(newLevel.toFixed(1)));
  };

  /* ---------------------- Render ---------------------- */
  return (
    <>
      <ConfirmDeleteModal
        open={modalOpen}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
        personName={pendingDelete?.name ?? ""}
        noteCount={pendingDelete ? getNoteCount(pendingDelete.id) : 0}
      />

      {/* Backdrop (Mobile) */}
      <div
        className={cn(
          "fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar Container */}
      <div
        className={cn(
          "fixed md:relative inset-y-0 left-0 z-50 bg-slate-50 border-r border-slate-200 flex flex-col h-full shrink-0 shadow-xl md:shadow-none transition-transform duration-300 ease-in-out md:transition-none",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        style={{ width: window.innerWidth >= 768 ? width : 256 }}
      >

        {/* Resize Handle */}
        <div
          className="hidden md:block absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-400 z-50"
          onMouseDown={(e) => {
            e.preventDefault();
            onResizeStart?.(e);
          }}
        />

        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-200/50">
          <div className="flex items-center gap-2">
          <img
  src={AppIcon}
  alt="The Ball Logo"
  className="w-6 h-6 object-contain"
/>
            <span className="font-semibold text-slate-700 truncate">
              The Ball
            </span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1 text-slate-400 hover:bg-slate-200 rounded"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col">

          {/* Quick Find */}
          <div className="p-2">
            <button
              onClick={onSearchClick}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 border border-transparent hover:border-slate-200"
            >
              <Search size={18} className="text-slate-400" />
              Quick Find
            </button>
          </div>

          {/* Calendar */}
          <div className="px-2">
            <button
              onClick={() => onNavigate("calendar")}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                currentView === "calendar"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                  : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
              )}
            >
              <Calendar
  size={18}
  className={cn(
    "transition-colors",
    currentView === "calendar" ? "text-blue-600" : "text-slate-400"
  )}
/>
              Calendar
            </button>
          </div>

          {/* Goals */}
<div className="px-2 mt-1">
  <button
    onClick={() => onNavigate("goals")}
    className={cn(
      "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
      currentView === "goals"
        ? "bg-white text-slate-900 shadow-sm border border-slate-200"
        : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
    )}
  >
<Target
  size={18}
  className={cn(
    "transition-colors",
    currentView === "goals"
      ? "text-red-500"
      : "text-slate-400"
  )}
/>
    Goals
  </button>
</div>

          {/* Section Title */}
          <div className="mt-4 px-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              One-on-Ones
            </span>

            <button
              onClick={() => setIsAdding(true)}
              className="p-1 hover:bg-slate-200 rounded text-slate-400"
            >
              <Plus size={14} />
            </button>
          </div>

          {/* Add Person Input */}
          {isAdding && (
            <form onSubmit={handleAddSubmit} className="px-3 mt-2">
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Name..."
                className="w-full text-sm px-2 py-1 rounded border border-slate-300 focus:outline-none focus:border-blue-500"
                onBlur={handleAddSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setIsAdding(false);
                    setNewName("");
                  }
                  if (e.key === "Enter") e.stopPropagation();
                }}
              />
            </form>
          )}

          {/* People List */}
          <div className="flex-1 overflow-y-auto px-2 mt-2 pb-4 space-y-1">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={people.map((p) => p.id)}
                strategy={verticalListSortingStrategy}
              >
                {people.map((p) => (
                  <SortablePersonRow
                    key={p.id}
                    person={p}
                    isActive={currentView === p.id}
                    isEditing={editingId === p.id}
                    editingName={editingId === p.id ? editingName : p.name}
                    onNavigate={() => onNavigate(p.id)}
                    onStartEdit={() => startEditPerson(p)}
                    onEditNameChange={setEditingName}
                    onEditSave={saveEditPerson}
                    onDelete={() => handleDeletePerson(p)}
                  />
                ))}
              </SortableContext>
            </DndContext>

            {people.length === 0 && !isAdding && (
              <div className="px-4 py-3 text-xs text-slate-400 italic">
                No 1:1s yet. Click + to add.
              </div>
            )}
          </div>

          {/* Zoom Controls */}
          <div className="p-3 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between bg-white p-1 rounded-md border border-slate-200 shadow-sm">
              <button onClick={() => handleZoom(-0.1)} className="p-1">
                <ZoomOut size={16} />
              </button>
              <span className="text-xs">{Math.round(zoomLevel * 100)}%</span>
              <button onClick={() => handleZoom(0.1)} className="p-1">
                <ZoomIn size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};