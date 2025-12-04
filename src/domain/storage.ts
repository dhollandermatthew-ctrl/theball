import { invoke } from "@tauri-apps/api/core";
import {
  AppState,
  defaultState,
  CURRENT_STATE_VERSION,
} from "./state";

const FILENAME = "state.json";

// -----------------------------------------------------
// MIGRATIONS
// -----------------------------------------------------
function migrateState(data: any): AppState {
  const migrated: AppState = {
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
    },
  };

  return migrated;
}

// -----------------------------------------------------
// LOAD FROM FILE VIA TAURI
// -----------------------------------------------------
export async function loadState(): Promise<AppState> {
  try {
    const raw = await invoke<string>("read_data_file", {
      file: FILENAME,
    });

    if (!raw) return defaultState;

    const parsed = JSON.parse(raw);

    if (typeof parsed.tasks === "function") {
      parsed.tasks = [];
    }

    return migrateState(parsed);
  } catch (err) {
    console.warn("loadState(): no file found → using default", err);
    return defaultState;
  }
}

// -----------------------------------------------------
// SAVE TO FILE VIA TAURI
// -----------------------------------------------------
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
    console.error("saveState error:", err);
  }
}