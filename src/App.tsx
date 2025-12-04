// FILE: src/App.tsx
import React, { useEffect, useState } from "react";
import { Menu } from "lucide-react";

import { Board } from "./components/Board";
import { Sidebar } from "./components/Sidebar";
import { OneOnOneView } from "./components/OneOnOneView";
import { SearchModal } from "./components/SearchModal";

import { useAppStore } from "./domain/state";
import { Task, OneOnOneItem, OneOnOnePerson } from "./domain/types";
import { generateId, getRandomColor } from "./domain/utils";

// ---------------------------------------------------------
// App
// ---------------------------------------------------------
function App() {
  const { tasks, people, oneOnOnes, settings, set, hydrated } = useAppStore();

  const [currentView, setCurrentView] = useState<string>("calendar");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);

  // -------------------------------------------------------
  // Sidebar resizing
  // -------------------------------------------------------
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingSidebar) return;

      const newWidth = Math.min(Math.max(e.clientX, 200), 400);

      set((draft) => {
        draft.settings.sidebarOpen = true;
        draft.settings.sidebarWidth = newWidth;
      });
    };

    const handleMouseUp = () => {
      if (isResizingSidebar) setIsResizingSidebar(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingSidebar, set]);

  // -------------------------------------------------------
  // Loading (store hydration)
  // -------------------------------------------------------
  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-500">
        Loading…
      </div>
    );
  }

  // -------------------------------------------------------
  // Settings update helper
  // -------------------------------------------------------
  const updateSettings = (partial: Partial<typeof settings>) => {
    set((draft) => {
      draft.settings = { ...draft.settings, ...partial };
    });
  };

  // -------------------------------------------------------
  // Task helpers
  // -------------------------------------------------------
  const updateTasks = (updater: (prev: Task[]) => Task[]) => {
    useAppStore.setState((state) => ({
      tasks: updater(state.tasks),
    }));
  };

  // -------------------------------------------------------
  // People
  // -------------------------------------------------------
  const addPerson = (name: string) => {
    const newPerson: OneOnOnePerson = {
      id: generateId(),
      name,
      avatarColor: getRandomColor(),
    };

    set((draft) => {
      draft.people.push(newPerson);
      draft.oneOnOnes[newPerson.id] = [];
    });

    setCurrentView(newPerson.id);
  };

  const deletePerson = (id: string) => {
    set((draft) => {
      draft.people = draft.people.filter((p) => p.id !== id);
      delete draft.oneOnOnes[id];
    });

    if (currentView === id) setCurrentView("calendar");
  };

  // -------------------------------------------------------
  // One-on-One Items
  // -------------------------------------------------------
  const addOneOnOneItem = (personId: string, content: string) => {
    const newItem: OneOnOneItem = {
      id: generateId(),
      content,
      isCompleted: false,
      createdAt: new Date().toISOString(),
    };

    set((draft) => {
      const existing = draft.oneOnOnes[personId] || [];
      draft.oneOnOnes[personId] = [newItem, ...existing];
    });
  };

  const updateOneOnOneItem = (id: string, content: string) => {
    set((draft) => {
      for (const [pid, list] of Object.entries(draft.oneOnOnes)) {
        draft.oneOnOnes[pid] = list.map((i) =>
          i.id === id ? { ...i, content } : i
        );
      }
    });
  };

  const toggleOneOnOneItem = (id: string) => {
    set((draft) => {
      for (const [pid, list] of Object.entries(draft.oneOnOnes)) {
        draft.oneOnOnes[pid] = list.map((i) =>
          i.id === id ? { ...i, isCompleted: !i.isCompleted } : i
        );
      }
    });
  };

  const deleteOneOnOneItem = (id: string) => {
    set((draft) => {
      for (const [pid, list] of Object.entries(draft.oneOnOnes)) {
        draft.oneOnOnes[pid] = list.filter((i) => i.id !== id);
      }
    });
  };

  // -------------------------------------------------------
  // Derived computed
  // -------------------------------------------------------
  const sidebarWidth =
    settings.sidebarOpen && settings.sidebarWidth
      ? settings.sidebarWidth
      : settings.sidebarOpen
      ? 260
      : 0;

  const activePerson = people.find((p) => p.id === currentView);
  const activeItems = activePerson ? oneOnOnes[activePerson.id] || [] : [];

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------
  return (
    <div
      className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden"
      style={{ zoom: settings.zoom }}
    >
      <Sidebar
        currentView={currentView}
        people={people}
        onNavigate={setCurrentView}
        onAddPerson={addPerson}
        onDeletePerson={deletePerson}
        onSearchClick={() => setIsSearchOpen(true)}
        isOpen={settings.sidebarOpen}
        onClose={() => updateSettings({ sidebarOpen: false })}
        width={sidebarWidth}
        onResizeStart={() => setIsResizingSidebar(true)}
        zoomLevel={settings.zoom}
        onZoomChange={(zoom) => updateSettings({ zoom })}
      />

      <main className="flex-1 h-full overflow-hidden bg-white border-l border-slate-200 relative">
        {!settings.sidebarOpen && (
          <button
            onClick={() => updateSettings({ sidebarOpen: true })}
            className="absolute top-3 left-4 z-40 p-2 bg-white/80 rounded-md shadow-sm border"
          >
            <Menu size={20} />
          </button>
        )}

        {currentView === "calendar" ? (
          <Board tasks={tasks} onTasksChange={updateTasks} />
        ) : activePerson ? (
          <OneOnOneView
            person={activePerson}
            items={activeItems}
            onAddItem={addOneOnOneItem}
            onUpdateItem={updateOneOnOneItem}
            onToggleItem={toggleOneOnOneItem}
            onDeleteItem={deleteOneOnOneItem}
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
        people={people}
        onNavigate={setCurrentView}
      />
    </div>
  );
}

export default App;