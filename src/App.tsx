// FILE: src/App.tsx
import React, { useEffect, useState } from "react";
import { Menu } from "lucide-react";

import { Board } from "./components/Board";
import { Sidebar } from "./components/Sidebar";
import { GoalView } from "./components/GoalView";
import { OneOnOneView } from "./components/OneOnOneView";
import { SearchModal } from "./components/SearchModal";
import { MeetingHub } from "./components/MeetingHub";

import {
  useAppStore,
  OneOnOneItem,
} from "./domain/state";

import { generateId, getRandomColor } from "./domain/utils";
import { MeetingSpace } from "@/domain/types";

function App() {
  const {
    tasks,
    people,
    oneOnOnes,
    goals,
    addGoal,
    updateGoal,
    deleteGoal,
    reorderGoals,
    settings,
    hydrated,
    set,

    addPerson,
    editPerson,
    reorderPeople,
    deletePerson,

    addOneOnOneItem,
    updateOneOnOneItem,
    deleteOneOnOneItem,

    getNoteCount,
  } = useAppStore();

  // ✅ SINGLE SOURCE OF TRUTH FOR GOAL ORDER
  const sortedGoals = React.useMemo(() => {
    return [...goals].sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );
  }, [goals]);


  const [meetingSpaces, setMeetingSpaces] = useState<MeetingSpace[]>(() => {
    const saved = localStorage.getItem("theball-meetings");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("theball-meetings", JSON.stringify(meetingSpaces));
  }, [meetingSpaces]);

  // -------------------------------------------
  // Local UI State
  // -------------------------------------------
  const [currentView, setCurrentView] = useState<
    "calendar" | "goals" | string
  >("calendar");

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  const sidebarOpen = settings.sidebarOpen;
  const sidebarWidth = settings.sidebarWidth ?? 260;
  const zoomLevel = settings.zoom;

  const setSidebarOpen = (v: boolean) =>
    set((draft) => {
      draft.settings.sidebarOpen = v;
    });

  const setZoomLevel = (v: number) =>
    set((draft) => {
      draft.settings.zoom = v;
    });

  const startSidebarResize = () => setIsResizingSidebar(true);

  // -------------------------------------------
  // Sidebar resizing handler
  // -------------------------------------------
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!isResizingSidebar) return;
      const width = Math.min(Math.max(e.clientX, 200), 400);

      set((draft) => {
        draft.settings.sidebarOpen = true;
        draft.settings.sidebarWidth = width;
      });
    };

    const stop = () => setIsResizingSidebar(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", stop);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", stop);
    };
  }, [isResizingSidebar, set]);

  // -------------------------------------------
  // Loading screen
  // -------------------------------------------
  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-500">
        Loading…
      </div>
    );
  }

  // -------------------------------------------
  // Helpers
  // -------------------------------------------
  const sortedPeople = [...people].sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  );

  const activePerson = sortedPeople.find((p) => p.id === currentView);
  const activeItems: OneOnOneItem[] = activePerson
    ? oneOnOnes[activePerson.id] || []
    : [];

  const handleToggleOneOnOneItem = (id: string) => {
    for (const list of Object.values(oneOnOnes)) {
      const found = list.find((i) => i.id === id);
      if (found) {
        updateOneOnOneItem(id, { isCompleted: !found.isCompleted });
        break;
      }
    }
  };

  // -------------------------------------------
  // Render
  // -------------------------------------------
  return (
    <div
      className="flex h-screen bg-slate-50 text-slate-900 overflow-hidden"
      style={{ zoom: zoomLevel }}
    >
      <Sidebar
        currentView={currentView}
        people={sortedPeople}
        onNavigate={setCurrentView}
        onAddPerson={(name) =>
          addPerson({
            id: generateId(),
            name,
            avatarColor: getRandomColor(),
            sortOrder: people.length,
          })
        }
        onDeletePerson={deletePerson}
        onEditPerson={editPerson}
        onReorderPeople={reorderPeople}
        getNoteCount={getNoteCount}
        onSearchClick={() => setIsSearchOpen(true)}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        width={sidebarWidth}
        onResizeStart={startSidebarResize}
        zoomLevel={zoomLevel}
        onZoomChange={setZoomLevel}
      />

      <main className="flex-1 h-full overflow-hidden bg-white relative border-l border-slate-200">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="absolute top-3 left-4 z-40 p-2 bg-white/80 rounded border shadow-sm"
          >
            <Menu size={20} />
          </button>
        )}

        {currentView === "calendar" ? (
          <Board />
        ) : currentView === "goals" ? (
          <GoalView
            goals={sortedGoals}   
            onAddGoal={() => {
              const today = new Date().toISOString().slice(0, 10);
              addGoal({
                id: generateId(),
                title: "New Goal",
                description: "",
                color: getRandomColor(),
                progress: 0,
                startDate: today,
                endDate: today,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                sort_order: goals.length,
              });
            }}
            onUpdateGoal={updateGoal}
            onDeleteGoal={deleteGoal}
            onReorderGoals={reorderGoals}
          />
        ) : currentView === "meetings" ? (
          <MeetingHub
            spaces={meetingSpaces}
            onUpdateSpaces={setMeetingSpaces}
          />
        ) : activePerson ? (
          <OneOnOneView
            person={activePerson}
            items={activeItems}
            onAddItem={(personId, content) =>
              addOneOnOneItem({
                id: generateId(),
                personId,
                content,
                isCompleted: false,
                createdAt: new Date().toISOString(),
              })
            }
            onUpdateItem={(id, content) =>
              updateOneOnOneItem(id, { content })
            }
            onToggleItem={handleToggleOneOnOneItem}
            onDeleteItem={deleteOneOnOneItem}
            onEditPerson={editPerson}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            Select a view
          </div>
        )}
      </main>

      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        tasks={tasks}
        items={Object.values(oneOnOnes).flat()}
        people={sortedPeople}
        onNavigate={setCurrentView}
      />
    </div>
  );
}

export default App;