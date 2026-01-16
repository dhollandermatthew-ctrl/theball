// FILE: src/domain/storage.ts
import { invoke } from "@tauri-apps/api/core";
import type { AppState } from "./state";
import { CURRENT_STATE_VERSION } from "./state";

const FILENAME = "state.json";

/* ----------------------------------------------
   MIGRATION → returns an AppState-shaped object
   (Zustand will override all function fields)
---------------------------------------------- */
function migrateState(data: any): Partial<AppState> {
  return {
    version: CURRENT_STATE_VERSION,

    // ------------------ DATA ------------------
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    people: Array.isArray(data.people) ? data.people : [],
    oneOnOnes:
      typeof data.oneOnOnes === "object" &&
      data.oneOnOnes !== null &&
      !Array.isArray(data.oneOnOnes)
        ? data.oneOnOnes
        : {},
    goals: Array.isArray(data.goals) ? data.goals : [],



    settings: {
      zoom: Number(data.settings?.zoom) || 1,
      sidebarOpen:
        typeof data.settings?.sidebarOpen === "boolean"
          ? data.settings.sidebarOpen
          : true,
      sidebarWidth:
        typeof data.settings?.sidebarWidth === "number"
          ? data.settings.sidebarWidth
          : 260,
    },

    hydrated: false,

    // ------------------ ZUSTAND FUNCTIONS (NO-OPS) ------------------
    // These are REQUIRED by AppState but replaced at runtime by Zustand

    set: () => {},
    setHydrated: () => {},

    // Goals
    loadGoals: () => {},
    addGoal: () => {},
    updateGoal: () => {},
    deleteGoal: () => {},
    reorderGoals: () => {},

    // Tasks
    addTask: () => {},
    updateTask: () => {},
    deleteTask: () => {},

    // People
    addPerson: () => {},
    editPerson: () => {},
    reorderPeople: () => {},
    deletePerson: () => {},

    // 1:1 Notes
    addOneOnOneItem: () => {},
    updateOneOnOneItem: () => {},
    deleteOneOnOneItem: () => {},

    // Helpers
    getNoteCount: () => 0,

  };
}

/* ----------------------------------------------
   LOAD (Tauri → Zustand hydration)
---------------------------------------------- */
export async function loadState(): Promise<Partial<AppState> | null> {
  try {
    const raw = await invoke<string>("read_data_file", { file: FILENAME });

    if (!raw || raw.trim().length === 0) {
      console.warn("loadState(): empty file → returning null");
      return null;
    }

    const parsed = JSON.parse(raw);
    return migrateState(parsed);
  } catch (err) {
    console.warn("loadState(): failed → returning null", err);
    return null;
  }
}

/* ----------------------------------------------
   SAVE (Zustand → Tauri JSON file)
---------------------------------------------- */
export async function saveState(state: AppState) {
  try {
    await invoke("write_data_file", {
      file: FILENAME,
      contents: JSON.stringify(
        { ...state, version: CURRENT_STATE_VERSION },
        null,
        2
      ),
    });
  } catch (err) {
    console.error("saveState(): error writing file", err);
  }
}