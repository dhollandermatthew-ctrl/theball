// FILE: src/App.tsx
import React, { useEffect, useState } from "react";
import { Menu } from "lucide-react";

import { Board } from "./components/Board";
import { Sidebar } from "./components/Sidebar";
import { OneOnOneView } from "./components/OneOnOneView";
import { SearchModal } from "./components/SearchModal";

import {
  useAppStore,
  Task,
  OneOnOneItem,
  OneOnOnePerson,
} from "./domain/state";

import { generateId, getRandomColor } from "./domain/utils";

function App() {
  const {
    tasks,
    people,
    oneOnOnes,
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

  // -------------------------------------------
  // Local UI State
  // -------------------------------------------
  const [currentView, setCurrentView] = useState("calendar");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  // Sidebar state derived from settings
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

    const stop = () => {
      if (isResizingSidebar) setIsResizingSidebar(false);
    };

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
    let current: OneOnOneItem | undefined;

    for (const list of Object.values(oneOnOnes)) {
      const found = list.find((i) => i.id === id);
      if (found) {
        current = found;
        break;
      }
    }

    if (current) {
      updateOneOnOneItem(id, { isCompleted: !current.isCompleted });
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
      {/* SIDEBAR */}
      <Sidebar
        currentView={currentView}
        people={sortedPeople}
        onNavigate={setCurrentView}
        onAddPerson={(name) => {
          const newPerson: OneOnOnePerson = {
            id: generateId(),
            name,
            avatarColor: getRandomColor(),
            sortOrder: people.length,
          };
          console.log("➕ APP → adding person:", newPerson);
          addPerson(newPerson);
        }}
        onDeletePerson={(id) => {
          console.log("🔥 APP.onDeletePerson called with id:", id);
          deletePerson(id);
          console.log("🔥 APP.onDeletePerson finished for id:", id);
        }}
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

      {/* MAIN CONTENT */}
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
          <Board tasks={tasks} />
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
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            Select a view
          </div>
        )}
      </main>

      {/* SEARCH MODAL */}
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