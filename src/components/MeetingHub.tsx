// FILE: src/components/MeetingHub.tsx
import React, { useMemo, useState } from "react";
import { Plus, ChevronRight, LayoutGrid, Trash2, GripVertical } from "lucide-react";

import type { MeetingSpace } from "@/domain/types";
import { cn, generateId, getRandomColor } from "@/domain/utils";
import { MeetingSpaceView } from "./MeetingSpaceView";

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
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface MeetingHubProps {
  spaces: MeetingSpace[];
  onUpdateSpaces: (spaces: MeetingSpace[]) => void;
}

export const MeetingHub: React.FC<MeetingHubProps> = ({
  spaces,
  onUpdateSpaces,
}) => {
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");

  const activeSpace = useMemo(
    () => spaces.find((s) => s.id === activeSpaceId) ?? null,
    [spaces, activeSpaceId]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = spaces.findIndex((s) => s.id === active.id);
    const newIndex = spaces.findIndex((s) => s.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(spaces, oldIndex, newIndex);
    onUpdateSpaces(reordered);
  };

  /* ---------------- Create space ---------------- */

  const handleCreateSpace = () => {
    const name = newSpaceName.trim();
    if (!name) return;

    const newSpace: MeetingSpace = {
      id: generateId(),
      name,
      description: "Meeting space for recurring conversations",
      category: "leadership",
      color: getRandomColor(),
      records: [],
    };

    console.log("[createSpace]", newSpace.id);

    onUpdateSpaces([newSpace, ...spaces]);
    setNewSpaceName("");
    setIsAdding(false);
    setActiveSpaceId(newSpace.id);
  };

  /* ---------------- Delete space (GUARANTEED) ---------------- */

  const deleteSpace = (spaceId: string) => {
    console.log("[deleteSpace] CLICKED", spaceId);
  
    const remainingSpaces = spaces.filter((s) => s.id !== spaceId);
  
    if (remainingSpaces.length === 0) {
      console.warn("[deleteSpace] blocked: would delete last space");
      alert("You must keep at least one meeting space.");
      return;
    }
  
    const space = spaces.find((s) => s.id === spaceId);
    if (!space) {
      console.error("[deleteSpace] space not found", spaceId);
      return;
    }
  
    console.log(
      "[deleteSpace] proceeding",
      "remaining:",
      remainingSpaces.map((s) => s.id)
    );
  
    // clear active space if needed
    if (activeSpaceId === spaceId) {
      setActiveSpaceId(null);
    }
  
    onUpdateSpaces(remainingSpaces);
  };

  /* ---------------- Update space ---------------- */

  const handleUpdateSpace = (updated: MeetingSpace) => {
    onUpdateSpaces(spaces.map((s) => (s.id === updated.id ? updated : s)));
  };

  /* ---------------- Space detail ---------------- */

  if (activeSpace) {
    return (
      <MeetingSpaceView
        space={activeSpace}
        onBack={() => setActiveSpaceId(null)}
        onUpdateSpace={handleUpdateSpace}
      />
    );
  }

  /* ---------------- Hub view ---------------- */

  const SortableSpaceCard: React.FC<{
    space: MeetingSpace;
  }> = ({ space }) => {
    const { attributes, listeners, setNodeRef, transform, transition } =
      useSortable({ id: space.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    const meetingCount = space.records?.length ?? 0;

    const participantCounts = new Map<string, number>();
    for (const record of space.records ?? []) {
      const raw = record.insight?.participants ?? [];
      const names = Array.from(
        new Set(
          raw
            .map((n) => n.trim())
            .filter((n) => n.length > 0),
        ),
      );
      for (const name of names) {
        participantCounts.set(name, (participantCounts.get(name) ?? 0) + 1);
      }
    }
    const participants = Array.from(participantCounts.keys());

    return (
      <div ref={setNodeRef} style={style}>
        <div className="relative group bg-white p-5 rounded-2xl border hover:border-indigo-400 hover:shadow-xl transition-all flex items-start justify-between gap-4">
          {/* Drag handle */}
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="mt-1 mr-1 hidden md:inline-flex cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing"
          >
            <GripVertical size={16} />
          </button>

          {/* DELETE BUTTON — NOT NESTED */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              deleteSpace(space.id);
            }}
            className="absolute top-3 right-3 z-50 bg-white p-1 rounded
                           opacity-0 group-hover:opacity-100
                           text-slate-400 hover:text-red-500 transition"
            title="Delete space"
          >
            <Trash2 size={16} />
          </button>

          {/* CARD CONTENT */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveSpaceId(space.id)}
            className="cursor-pointer flex-1"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0",
                    space.color
                  )}
                >
                  <LayoutGrid size={18} />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">
                    {space.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {meetingCount} meeting(s)
                    {participants.length > 0 && (
                      <>
                        {" "}
                        · {participants.length}{" "}
                        {participants.length === 1 ? "person" : "people"}
                      </>
                    )}
                  </div>
                  {participants.length > 0 && (
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                      {participants.slice(0, 4).join(", ")}
                      {participants.length > 4 &&
                        ` +${participants.length - 4} more`}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-indigo-600 flex items-center gap-1 text-sm font-semibold flex-shrink-0">
                Open <ChevronRight size={16} />
              </div>
            </div>

            {space.description && (
              <p className="text-sm text-slate-500 mt-3 line-clamp-2">
                {space.description}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto p-6 md:p-10 bg-slate-50">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Meetings</h1>
            <p className="text-slate-500 mt-1">
              Persistent memory for important conversations.
            </p>
          </div>

          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-800 transition"
          >
            <Plus size={16} />
            New Space
          </button>
        </div>

        {isAdding && (
          <div className="mb-6 p-4 bg-white rounded-2xl border border-slate-200">
            <div className="flex gap-2">
              <input
                autoFocus
                value={newSpaceName}
                onChange={(e) => setNewSpaceName(e.target.value)}
                placeholder="e.g. Leadership Weekly, Architecture Review..."
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button
                onClick={handleCreateSpace}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold"
              >
                Create
              </button>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setNewSpaceName("");
                }}
                className="px-3 py-2 text-slate-500"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={spaces.map((s) => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {spaces.map((space) => (
                  <SortableSpaceCard
                    key={space.id}
                    space={space}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
    </div>
  );
};
