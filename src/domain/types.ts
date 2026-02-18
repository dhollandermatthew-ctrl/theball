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
    
    // Normal call fields
    followUps?: string[];
    openQuestions?: string[];
    
    // Discovery call fields
    featureRequests?: string[];
    problemSignals?: string[];
  }

  export interface MeetingRecord {
    id: string;
    title: string;
    date: string;
    transcript: string;
    notes?: string;
    meetingType?: "normal" | "discovery"; // Optional for backwards compatibility
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

  // --------------------------------------------------
  // HEALTH
  // --------------------------------------------------

  export interface LabValue {
    name: string;
    value: string;
    unit: string;
    referenceRange?: string;
    flag?: "H" | "L" | "HH" | "LL" | "CRIT"; // High, Low, Very High, Very Low, Critical
  }

  export interface BloodWorkRecord {
    id: string;
    date: string; // Date of blood test
    labName?: string; // e.g., "LifeLabs"
    sourceType: "pdf" | "image" | "manual";
    sourceFileName?: string;
    labValues: LabValue[];
    aiAnalysis?: string; // AI-generated insights about the results
    aiFlags?: string[]; // Specific concerns flagged by AI
    notes?: string; // User notes
    createdAt: string;
  }

  export interface PersonalProfile {
    dateOfBirth?: string; // ISO date string
    sex?: "male" | "female" | "other";
    weight?: number; // in lbs
    height?: number; // in cm
    // These factors influence reference ranges for many lab values
  }

  export interface HealthData {
    bloodWorkRecords: BloodWorkRecord[];
    workoutRecords: WorkoutRecord[];
    personalProfile?: PersonalProfile;
  }

  // --------------------------------------------------
  // FITNESS
  // --------------------------------------------------

  export interface WorkoutRecord {
    id: string;
    date: string; // Date of workout
    type: "run" | "treadmill" | "bike" | "walk" | "other";
    distance?: number; // in km
    duration?: number; // in minutes
    pace?: string; // e.g., "6:02 min/km"
    calories?: number;
    sourceType: "image" | "manual";
    sourceFileName?: string;
    notes?: string;
    createdAt: string;
  }
