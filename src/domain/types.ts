// FILE: src/domain/types.ts
// --------------------------------------------------
// SINGLE SOURCE OF TRUTH FOR ALL TYPES
// Re-export everything from state.ts so UI + store match
// --------------------------------------------------

import type {
  Task as StoreTask,
  OneOnOneItem as StoreOneOnOneItem,
  OneOnOnePerson as StoreOneOnOnePerson,
} from "./state";

// 1) Mirror the store's Task shape exactly
export type Task = StoreTask;

// 2) Extract enums directly from the store Task type
export type TaskStatus = Task["status"];       // "todo" | "in_progress" | "done" | "missed"
export type TaskPriority = Task["priority"];   // "p1" | "p2" | "p3"
export type TaskCategory = Task["category"];   // "work" | "personal"

// 3) One-on-one items & people
export type OneOnOneItem = StoreOneOnOneItem;
export type OneOnOnePerson = StoreOneOnOnePerson;

// 4) Used by calendar/month views
export interface DayColumnData {
  date: Date;
  tasks: Task[];
  isToday: boolean;
}

// 5) Web Speech API (you had this already)
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}