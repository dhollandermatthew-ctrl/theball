// FILE: src/domain/types.ts
// --------------------------------------------------
// SINGLE SOURCE OF TRUTH FOR ALL TYPES
// Mirrors store types but lets us extend them safely.
// --------------------------------------------------

import type {
  Task as StoreTask,
  OneOnOneItem as StoreOneOnOneItem,
  OneOnOnePerson as StoreOneOnOnePerson,
} from "./state";

// --------------------------------------------------
// TASKS
// --------------------------------------------------

// Extend the store's Task type by adding title + content
export interface Task extends StoreTask {
  title: string;
  content: string;
}

// Extract enums directly from Task
export type TaskStatus = Task["status"];
export type TaskPriority = Task["priority"];
export type TaskCategory = Task["category"];

// --------------------------------------------------
// GOALS  ✅ NEW
// --------------------------------------------------

export interface Goal {
  id: string;
  title: string;
  description: string; // HTML
  color: string;
  progress: number; // 0–100
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
  sort_order: number; // ✅ REQUIRED (DB + DnD + ordering)

}

// --------------------------------------------------
// ONE-ON-ONES
// --------------------------------------------------

export type OneOnOneItem = StoreOneOnOneItem;
export type OneOnOnePerson = StoreOneOnOnePerson;

// --------------------------------------------------
// CALENDAR / MONTH VIEW
// --------------------------------------------------

export interface DayColumnData {
  date: Date;
  tasks: Task[];
  isToday: boolean;
}

// --------------------------------------------------
// WEB SPEECH API
// --------------------------------------------------

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}


export interface AITaskInput {
  title: string;
  content: string;
}

export interface AITaskOutput {
  title: string;
  content: string;
}