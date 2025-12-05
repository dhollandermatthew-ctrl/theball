import { create } from "zustand";
import { persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import { loadState, saveState } from "./storage";

export const CURRENT_STATE_VERSION = 3;

// -----------------------------------------------------
// Types
// -----------------------------------------------------
export interface Task {
  id: string;
  content: string;
  date: string;

  status: "todo" | "in_progress" | "done";
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
}

export interface Settings {
  zoom: number;
  sidebarOpen: boolean;
  sidebarWidth?: number;
}

// -----------------------------------------------------
// Main State Shape
// -----------------------------------------------------
export interface AppState {
  version: number;

  tasks: Task[];
  people: OneOnOnePerson[];
  oneOnOnes: Record<string, OneOnOneItem[]>;

  settings: Settings;

  hydrated: boolean;

  // actions
  set: (fn: (draft: AppState) => void) => void;
  hydrate: (incoming: Partial<AppState>) => void;
}

// -----------------------------------------------------
// Default state
// -----------------------------------------------------
const defaultState: Omit<AppState, "set" | "hydrate"> = {
  version: CURRENT_STATE_VERSION,

  tasks: [],
  people: [],
  oneOnOnes: {},

  settings: {
    zoom: 1,
    sidebarOpen: true,
    sidebarWidth: 260,
  },

  hydrated: false,
};

// -----------------------------------------------------
// Store (Zustand)
// -----------------------------------------------------
export const useAppStore = create<AppState>()(
  persist(
    immer((set, get) => ({
      ...defaultState,

      // Generic setter
      set: (fn) => {
        set((state) => fn(state));
        saveState(get());
      },

      // Manual hydration
      hydrate: (incoming) => {
        const current = get();

        const merged: AppState = {
          ...current,
          ...incoming,
          settings: {
            ...current.settings,
            ...(incoming?.settings || {}),
          },
          hydrated: true, // << key fix
        };

        set(() => merged);
        saveState(merged);
      },
    })),
    {
      name: "app_state_mirror",
      version: CURRENT_STATE_VERSION,

      // We tell Zustand: “Don’t auto-hydrate — we will do it manually.”
      skipHydration: true,
    }
  )
);

// -----------------------------------------------------
// Initialization — MUST run before React renders
// -----------------------------------------------------
export async function initializeAppState() {
  const store = useAppStore.getState();

  if (store.hydrated) {
    console.log("⚠️ initializeAppState skipped — already hydrated");
    return;
  }

  console.log("🔄 Loading state.json from Tauri FS…");
  const stored = await loadState();

  console.log("🔄 Calling store.hydrate()…");
  store.hydrate(stored);
}

// Debug hook
;(window as any).store = useAppStore;

export { defaultState };