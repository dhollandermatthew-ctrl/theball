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
  sidebarWidth?: number; // optional so your resize logic doesn’t break
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

  hydrated: boolean; // << needed for manual hydration

  // actions
  set: (fn: (draft: AppState) => void) => void;
  hydrate: (incoming: Partial<AppState>) => void;
}

// -----------------------------------------------------
// Default State
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
// Store
// -----------------------------------------------------
export const useAppStore = create<AppState>()(
  persist(
    immer((set, get) => ({
      ...defaultState,

      // Universal state setter
      set: (fn) => {
        set((state) => {
          fn(state);
        });

        // Save after each modification
        saveState(get());
      },

      // Manual hydration
      hydrate: (incoming) => {
        const state = get();

        const merged: AppState = {
          ...state,
          ...incoming,
          settings: {
            ...state.settings,
            ...(incoming?.settings || {}),
          },
          hydrated: true,
        };

        set(() => merged);
        saveState(merged);
      },
    })),
    {
      name: "app_state_mirror",
      version: CURRENT_STATE_VERSION,
      skipHydration: true, // required because we hydrate manually via filesystem
    }
  )
);

// -----------------------------------------------------
// Initialization — run once at app startup
// -----------------------------------------------------
export async function initializeAppState() {
  try {
    const state = useAppStore.getState();

    if (state.hydrated) {
      console.log("⚠️ initializeAppState skipped — already hydrated");
      return;
    }

    console.log("🔄 Loading state.json from Tauri FS…");
    const stored = await loadState();

    console.log("🔄 Calling store.hydrate()…");
    state.hydrate(stored);
  } catch (err) {
    console.error("❌ initializeAppState error:", err);
  }
}

// Debugging
;(window as any).store = useAppStore;

export { defaultState };