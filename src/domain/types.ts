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

  export type TaskType = "calendar" | "oneonone";

  // Extend the store's Task type by adding title + content
  export interface Task extends StoreTask {
    title: string;
    content: string;

    taskType: TaskType; // 🔑 REQUIRED — calendar vs 1:1

    // 1:1 association
    conversationWith?: string; // OneOnOnePerson.id
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

  // --------------------------------------------------
  // MEETINGS (SINGLE SOURCE OF TRUTH)
  // --------------------------------------------------

  export interface MeetingInsight {
    summary: string;
    /**
     * Unique human participants detected in the transcript.
     * Optional for backward compatibility with existing records.
     */
    participants?: string[];
    keyLearnings: string[];
    followUps: string[];
    openQuestions: string[];
  }

  export interface MeetingRecord {
    id: string;
    title: string;
    date: string;
    transcript: string;
    notes?: string;
    insight?: MeetingInsight;
    createdAt: string;
  }

  export interface MeetingSpace {
    id: string;
    name: string;
    description: string;
    category: "tech" | "architecture" | "leadership" | "client";
    color: string;
    records: MeetingRecord[];
    spaceNotes?: SpaceNotePage[];

  }

  export interface SpaceNotePage {
    id: string;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
  }
