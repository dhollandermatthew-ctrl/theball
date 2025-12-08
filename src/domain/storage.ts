// FILE: src/domain/storage.ts
import { invoke } from "@tauri-apps/api/core";
import {
  AppState,
  defaultState,
  CURRENT_STATE_VERSION,
} from "./state";

const FILENAME = "state.json";

/* ----------------------------------------------
   MIGRATION → returns an AppState-shaped object
   (Zustand will override all function fields)
---------------------------------------------- */
function migrateState(data: any): AppState {
  return {
    version: CURRENT_STATE_VERSION,

    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    people: Array.isArray(data.people) ? data.people : [],
    oneOnOnes:
      typeof data.oneOnOnes === "object" &&
      data.oneOnOnes !== null &&
      !Array.isArray(data.oneOnOnes)
        ? data.oneOnOnes
        : {},

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

    // REQUIRED FIELD
    hydrated: false,

    // Zustand will replace all these functions at runtime
    set: () => {},
    setHydrated: () => {},

    addTask: () => {},
    updateTask: () => {},
    deleteTask: () => {},

    addPerson: () => {},
    editPerson: () => {},
    reorderPeople: () => {},
    deletePerson: () => {},

    addOneOnOneItem: () => {},
    updateOneOnOneItem: () => {},
    deleteOneOnOneItem: () => {},

    getNoteCount: () => 0,
  };
}

/* ----------------------------------------------
   LOAD (Tauri → Zustand hydration)
---------------------------------------------- */
export async function loadState(): Promise<AppState | null> {
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