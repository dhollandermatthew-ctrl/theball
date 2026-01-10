// FILE: src/App.tsx

import React, { useEffect, useState, useMemo } from "react";
import { Menu } from "lucide-react";

import { Board } from "./components/Board";
import { Sidebar } from "./components/Sidebar";
import { GoalView } from "./components/GoalView";
import { OneOnOneTaskView } from "./components/OneOnOneTaskView";
import { SearchModal } from "./components/SearchModal";
import { MeetingHub } from "./components/MeetingHub";

import { generateId, getRandomColor } from "./domain/utils";
import { MeetingSpace, Task } from "@/domain/types";
import { useAppStore, initializeAppState } from "./domain/state";

function App() {
  const {
    tasks,
    people,
    goals,

    addTask,
    updateTask,
    deleteTask,

    addGoal,
    updateGoal,
    deleteGoal,
    reorderGoals,

    addPerson,
    editPerson,
    reorderPeople,
    deletePerson,

    settings,
    hydrated,
    set,

    getNoteCount,
  } = useAppStore();

  // ✅ REQUIRED: hydrate from Turso on app start
  useEffect(() => {
    initializeAppState();
  }, []);

  /* -------------------------------------------------- */
  /* Derived Data                                       */
  /* -------------------------------------------------- */

  const sortedGoals = useMemo(
    () => [...goals].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [goals]
  );

  const sortedPeople = useMemo(
    () => [...people].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)),
    [people]
  );

  /* -------------------------------------------------- */
  /* Local UI State                                     */
  /* -------------------------------------------------- */

  const [currentView, setCurrentView] = useState<
    "calendar" | "goals" | "meetings" | string
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

  /* -------------------------------------------------- */
  /* Meetings (local storage)                           */
  /* -------------------------------------------------- */

  const [meetingSpaces, setMeetingSpaces] = useState<MeetingSpace[]>(() => {
    const saved = localStorage.getItem("theball-meetings");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("theball-meetings", JSON.stringify(meetingSpaces));
  }, [meetingSpaces]);

  /* -------------------------------------------------- */
  /* Sidebar resize                                     */
  /* -------------------------------------------------- */

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

  /* -------------------------------------------------- */
  /* Loading                                            */
  /* -------------------------------------------------- */

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-500">
        Loading…
      </div>
    );
  }

  /* -------------------------------------------------- */
  /* Active Person                                      */
  /* -------------------------------------------------- */

  const activePerson = sortedPeople.find((p) => p.id === currentView);

  /* -------------------------------------------------- */
  /* Task creation from 1:1                             */
  /* -------------------------------------------------- */

  const handleCreateTaskForPerson = (personId: string, content: string) => {
    const title = content.replace(/<[^>]+>/g, "").slice(0, 60) || "Follow-up";
  
    addTask({
      id: generateId(),
      title,
      content,
      taskType: "oneonone",
      conversationWith: personId,
      date: new Date().toISOString().slice(0, 10),
      status: "todo",
      priority: "p3",
      category: "work",
      createdAt: new Date().toISOString(),
    });
  };

  /* -------------------------------------------------- */
  /* Render                                             */
  /* -------------------------------------------------- */

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
        onResizeStart={() => setIsResizingSidebar(true)}
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
          <MeetingHub spaces={meetingSpaces} onUpdateSpaces={setMeetingSpaces} />
        ) : activePerson ? (
          <OneOnOneTaskView
            person={activePerson}
            tasks={tasks.filter(
              (t: Task) =>
                t.taskType === "oneonone" &&
                t.conversationWith === activePerson.id
            )}
            onCreateTask={handleCreateTaskForPerson}
            onUpdateTaskStatus={(id, status) => updateTask(id, { status })}
            onUpdateTaskPriority={(id, priority) => updateTask(id, { priority })}
            onUpdateTaskContent={(id, content) => updateTask(id, { content })}
            onUpdateTaskTitle={(id, title) => updateTask(id, { title })}
            onDeleteTask={deleteTask}
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
        items={[]}
        people={sortedPeople}
        onNavigate={setCurrentView}
      />
    </div>
  );
}

export default App;