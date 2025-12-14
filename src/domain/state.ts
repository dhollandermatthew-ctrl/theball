  // FILE: src/domain/state.ts
  import { create } from "zustand";
  import { immer } from "zustand/middleware/immer";
  import type { Goal } from "./types";

  import { enqueue } from "@/db/sync";
  import { db } from "@/db/client";

  import {
    tasks as tasksTable,
    oneOnOnes as oneOnOneTable,
    oneOnOnePeople as oneOnOnePeopleTable,
    goals as goalsTable,
  } from "@/db/schema";

  export const CURRENT_STATE_VERSION = 3;



  // -----------------------------------------------------
  // Types
  // -----------------------------------------------------
  export interface Task {
    id: string;
    title: string; // ← ADD THIS
    content: string;
    date: string;

    status: "todo" | "in_progress" | "done" | "missed";
    priority: "p1" | "p2" | "p3";
    category: "work" | "personal";

    createdAt: string;
  }

  export interface OneOnOneItem {
    id: string;
    personId: string;
    content: string;
    isCompleted: boolean;
    createdAt: string;
  }

  export interface OneOnOnePerson {
    id: string;
    name: string;
    avatarColor: string;
    sortOrder: number;
  }

  export interface Settings {
    zoom: number;
    sidebarOpen: boolean;
    sidebarWidth?: number;
  }

  // -----------------------------------------------------
  // Main app state shape
  // -----------------------------------------------------
  export interface AppState {
    version: number;

    tasks: Task[];
    people: OneOnOnePerson[];
    oneOnOnes: Record<string, OneOnOneItem[]>;
    goals: Goal[];


    settings: Settings;

    hydrated: boolean;

    set: (fn: (draft: AppState) => void) => void;
    setHydrated: () => void;
    
    // Goals
    loadGoals: (goals: Goal[]) => void;
    addGoal: (goal: Goal) => void;
    updateGoal: (id: string, updates: Partial<Goal>) => void;
    deleteGoal: (id: string) => void;
    reorderGoals: (goals: Goal[]) => void; // ✅ ADD THIS LINE

    // Tasks
    addTask: (task: Task) => void;
    updateTask: (id: string, updates: Partial<Task>) => void;
    deleteTask: (id: string) => void;

    // 1:1 people
    addPerson: (p: OneOnOnePerson) => void;
    editPerson: (id: string, updates: Partial<OneOnOnePerson>) => void;
    reorderPeople: (orderedIds: string[]) => void;
    deletePerson: (id: string) => void;

    // 1:1 notes
    addOneOnOneItem: (item: OneOnOneItem) => void;
    updateOneOnOneItem: (id: string, updates: Partial<OneOnOneItem>) => void;
    deleteOneOnOneItem: (id: string) => void;

    // helpers
    getNoteCount: (id: string) => number;
  }

  // -----------------------------------------------------
  // Default state
  // -----------------------------------------------------
// -----------------------------------------------------
// Default state
// -----------------------------------------------------
export const defaultState: Pick<
  AppState,
  | "version"
  | "tasks"
  | "people"
  | "oneOnOnes"
  | "goals"
  | "settings"
  | "hydrated"
> = {
  version: CURRENT_STATE_VERSION,

  tasks: [],
  people: [],
  oneOnOnes: {},
  goals: [],

  settings: {
    zoom: 1,
    sidebarOpen: true,
    sidebarWidth: 260,  
  },

  hydrated: false,
};
  export type PersistedState = typeof defaultState;
  // -----------------------------------------------------
  // Zustand Store
  // -----------------------------------------------------
  export const useAppStore = create<AppState>()(
    immer((set, get) => ({
      ...defaultState,

      set: (fn) => set(fn),

      setHydrated: () =>
        set((s) => {
          s.hydrated = true;
        }),

      // ---------------------- TASKS ----------------------
      addTask: (task) =>
        set((state) => {
          state.tasks.push(task);

          enqueue({
            type: "insert",
            table: "tasks",
            data: task,
          });
        }),

      updateTask: (id, updates) =>
        set((state) => {
          const t = state.tasks.find((t) => t.id === id);
          if (!t) return;

          Object.assign(t, updates);

          enqueue({
            type: "update",
            table: "tasks",
            id,
            data: updates,
          });
        }),

      deleteTask: (id) =>
        set((state) => {
          state.tasks = state.tasks.filter((t) => t.id !== id);

          enqueue({
            type: "delete",
            table: "tasks",
            id,
          });
        }),

  // ---------------------- GOALS ----------------------
// ---------------------- GOALS ----------------------

loadGoals: (goals) =>
  set((state) => {
    state.goals = goals;
  }),
    
  addGoal: (goal) =>
      set((state) => {
        const next: Goal = {
          ...goal,
          sort_order: state.goals.length,
        };
    
        state.goals.push(next);
    
        enqueue({
          type: "insert",
          table: "goals",
          data: next,
        });
      }),

  updateGoal: (id, updates) =>
    set((state) => {
      const goal = state.goals.find((g) => g.id === id);
      if (!goal) return;

      Object.assign(goal, updates, {
        updatedAt: new Date().toISOString(),
      });

      enqueue({
        type: "update",
        table: "goals",
        id,
        data: updates,
      });
    }),

  deleteGoal: (id) =>
    set((state) => {
      state.goals = state.goals.filter((g) => g.id !== id);

      enqueue({
        type: "delete",
        table: "goals",
        id,
      });
    }),

    reorderGoals: (orderedGoals) =>
      set((state) => {
        const next = assignGoalSortOrder(orderedGoals);
        state.goals = next;
    
        next.forEach((g) => {
          enqueue({
            type: "update",
            table: "goals",
            id: g.id,
            data: { sort_order: g.sort_order },
          });
        });
      }),

      // ---------------------- 1:1 PEOPLE ----------------------
      addPerson: (person) =>
        set((state) => {
          const maxOrder =
            state.people.length > 0
              ? Math.max(...state.people.map((p) => p.sortOrder))
              : 0;

          person.sortOrder = maxOrder + 1;

          state.people.push(person);

          enqueue({
            type: "insert",
            table: "oneOnOnePeople",
            data: person,
          });
        }),

      editPerson: (id, updates) =>
        set((state) => {
          const person = state.people.find((p) => p.id === id);
          if (!person) return;

          Object.assign(person, updates);

          enqueue({
            type: "update",
            table: "oneOnOnePeople",
            id,
            data: updates,
          });
        }),

      reorderPeople: (orderedIds) =>
        set((state) => {
          state.people = orderedIds.map((id, index) => {
            const p = state.people.find((x) => x.id === id)!;
            p.sortOrder = index;

            enqueue({
              type: "update",
              table: "oneOnOnePeople",
              id,
              data: { sortOrder: index },
            });

            return p;
          });
        }),

        deletePerson: (id) =>
          set((state) => {
            console.log("🗑 STATE → deleting person:", id);
        
            // Remove all 1:1 notes for this person
            if (state.oneOnOnes[id]) {
              delete state.oneOnOnes[id];
            }
        
            // Remove the person
            state.people = state.people.filter((p) => p.id !== id);
        
            console.log("✅ STATE → person removed from memory");
        
            // DB delete
            enqueue({
              type: "delete",
              table: "oneOnOnePeople",
              id,
            });
        
            console.log("📡 DB delete enqueued:", id);
          }),

      getNoteCount: (id) => {
        const st = get();
        return st.oneOnOnes[id]?.length ?? 0;
      },

      // ---------------------- 1:1 NOTES ----------------------
      addOneOnOneItem: (item) =>
        set((state) => {
          const list = state.oneOnOnes[item.personId] ?? [];
          state.oneOnOnes[item.personId] = [item, ...list];

          enqueue({
            type: "insert",
            table: "oneOnOnes",
            data: item,
          });
        }),

      updateOneOnOneItem: (id, updates) =>
        set((state) => {
          for (const list of Object.values(state.oneOnOnes)) {
            const found = list.find((i) => i.id === id);
            if (found) {
              Object.assign(found, updates);

              enqueue({
                type: "update",
                table: "oneOnOnes",
                id,
                data: updates,
              });
            }
          }
        }),

      deleteOneOnOneItem: (id) =>
        set((state) => {
          for (const [pid, list] of Object.entries(state.oneOnOnes)) {
            const next = list.filter((i) => i.id !== id);
            if (next.length !== list.length) {
              state.oneOnOnes[pid] = next;
            }
          }

          enqueue({
            type: "delete",
            table: "oneOnOnes",
            id,
          });
        }),
    }))
  );

  function assignGoalSortOrder(goals: Goal[]): Goal[] {
    // DO NOT sort here. Trust the array order coming from DnD.
    return goals.map((g, i) => ({
      ...g,
      sort_order: i,
    }));
  }

  // -----------------------------------------------------
  // INITIALIZATION — Load from Turso
  // -----------------------------------------------------
  export async function initializeAppState() {
    const store = useAppStore.getState();
    if (store.hydrated) return;

    console.log("🔄 Hydrating from Turso database…");

    try {
      const [taskRows, oneOnOneRows, peopleRows, goalRows] = await Promise.all([
        db.select().from(tasksTable),
        db.select().from(oneOnOneTable),
        db.select().from(oneOnOnePeopleTable),
        db.select().from(goalsTable),
      ]);
      const grouped: Record<string, OneOnOneItem[]> = {};
      for (const row of oneOnOneRows) {
        const item = row as unknown as OneOnOneItem;
        (grouped[item.personId] ??= []).push(item);
      }

      useAppStore.setState((s) => {
        s.tasks = taskRows as Task[];
        s.goals = (goalRows as Goal[]).sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
        );
        s.people = (peopleRows as OneOnOnePerson[]).sort(
          (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
        );
        s.oneOnOnes = grouped;
        s.hydrated = true;
      });

      console.log("✅ DB hydration complete");
    } catch (err) {
      console.error("❌ Failed to hydrate from DB:", err);
    }
  }

  // Devtools helper
  // @ts-ignore
  (window as any).store = useAppStore;