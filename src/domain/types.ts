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

// Extend the store's Task type by adding title + content
export interface Task extends StoreTask {
  title: string;       // NEW
  content: string;     // NEW (previously your only field)
}

// Extract enums directly from Task
export type TaskStatus = Task["status"];     
export type TaskPriority = Task["priority"]; 
export type TaskCategory = Task["category"]; 

// One-on-one items & people
export type OneOnOneItem = StoreOneOnOneItem;
export type OneOnOnePerson = StoreOneOnOnePerson;

// Used by calendar/month views
export interface DayColumnData {
  date: Date;
  tasks: Task[];
  isToday: boolean;
}

// Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}