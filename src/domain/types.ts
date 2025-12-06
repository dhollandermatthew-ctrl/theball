export type TaskStatus = "todo" | "done" | "missed" | "maybe";
export type TaskPriority = "high" | "medium" | "low";
export type TaskCategory = "work" | "personal";

export interface Task {
  id: string;
  content: string;
  date: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  createdAt?: string;
}

export interface DayColumnData {
  date: Date;
  tasks: Task[];
  isToday: boolean;
}

// Add support for Web Speech API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}