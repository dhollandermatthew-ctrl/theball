// FILE: src/db/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// -----------------------------------------------------
// TASKS TABLE
// -----------------------------------------------------
export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default("New Task"),
  content: text("content").notNull(),
  date: text("date"),

  // ✅ ADD THESE
  taskType: text("taskType"),
  conversationWith: text("conversationWith"),

  status: text("status").notNull(),
  priority: text("priority").notNull(),
  category: text("category").notNull(),

  createdAt: text("createdAt").notNull(),
});

// -----------------------------------------------------
// 1:1 PEOPLE TABLE
// -----------------------------------------------------
export const oneOnOnePeople = sqliteTable("one_on_one_people", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  avatarColor: text("avatarColor").notNull(),
  sortOrder: integer("sortOrder").notNull(),
});

// -----------------------------------------------------
// 1:1 NOTES TABLE
// -----------------------------------------------------
export const oneOnOnes = sqliteTable("one_on_ones", {
  id: text("id").primaryKey(),
  personId: text("personId").notNull(),
  content: text("content").notNull(),
  isCompleted: integer("isCompleted", { mode: "boolean" }).notNull(),
  createdAt: text("createdAt").notNull(),
});

// -----------------------------------------------------
// PROMPTS TABLE
// -----------------------------------------------------
export const prompts = sqliteTable("prompts", {
  id: text("id").primaryKey(),
  createdAt: text("createdAt").notNull(),

  userInput: text("userInput").notNull(),
  aiOutput: text("aiOutput").notNull(),
});

// -----------------------------------------------------
// AI LOGGING TABLE
// -----------------------------------------------------
export const aiLogs = sqliteTable("ai_logs", {
  id: text("id").primaryKey(),
  createdAt: text("createdAt").notNull(),

  eventType: text("eventType").notNull(),
  userMessage: text("userMessage").notNull(),
  aiMessage: text("aiMessage").notNull(),
  metadata: text("metadata"),
});

// -----------------------------------------------------
// GOALS TABLE
// -----------------------------------------------------
export const goals = sqliteTable("goals", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  color: text("color").notNull(),
  progress: integer("progress").notNull(),
  startDate: text("startDate").notNull(),
  endDate: text("endDate").notNull(),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
  sort_order: integer("sort_order").notNull(),
});

// -----------------------------------------------------
// MEETINGS TABLES
// -----------------------------------------------------
export const meetingSpaces = sqliteTable("meeting_spaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // tech|architecture|leadership|client
  color: text("color").notNull(),
  sortOrder: integer("sortOrder"),
  createdAt: text("createdAt").notNull(),
});

export const meetingRecords = sqliteTable("meeting_records", {
  id: text("id").primaryKey(),
  spaceId: text("spaceId").notNull(), // References meeting_spaces(id)
  title: text("title").notNull(),
  date: text("date").notNull(),
  transcript: text("transcript").notNull(), // Full transcript text
  notes: text("notes"), // Optional user notes
  meetingType: text("meetingType"), // normal|discovery
  insight: text("insight"), // JSON string: {summary, participants, keyLearnings, followUps, etc.}
  createdAt: text("createdAt").notNull(),
});

export const spaceNotes = sqliteTable("space_notes", {
  id: text("id").primaryKey(),
  spaceId: text("spaceId").notNull(), // References meeting_spaces(id)
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: text("createdAt").notNull(),
  updatedAt: text("updatedAt").notNull(),
});

// -----------------------------------------------------
// HEALTH TABLES
// -----------------------------------------------------
export const healthBloodwork = sqliteTable("health_bloodwork", {
  id: text("id").primaryKey(),
  date: text("date").notNull(), // Date of blood test
  labName: text("labName"), // e.g., "LifeLabs"
  sourceType: text("sourceType").notNull(), // pdf|image|manual
  sourceFileName: text("sourceFileName"),
  labValues: text("labValues").notNull(), // JSON array: [{name, value, unit, referenceRange, flag}]
  aiAnalysis: text("aiAnalysis"), // AI-generated insights
  aiFlags: text("aiFlags"), // JSON array of concern strings
  notes: text("notes"), // User notes
  createdAt: text("createdAt").notNull(),
});

export const healthWorkouts = sqliteTable("health_workouts", {
  id: text("id").primaryKey(),
  date: text("date").notNull(), // Date of workout
  type: text("type").notNull(), // run|treadmill|bike|walk|other
  distance: integer("distance"), // in km (stored as integer for simplicity)
  duration: integer("duration"), // in minutes
  pace: text("pace"), // e.g., "6:02 min/km"
  calories: integer("calories"),
  sourceType: text("sourceType").notNull(), // image|manual
  sourceFileName: text("sourceFileName"),
  notes: text("notes"),
  createdAt: text("createdAt").notNull(),
});

export const healthProfile = sqliteTable("health_profile", {
  id: text("id").primaryKey(), // Singleton (only 1 row)
  dateOfBirth: text("dateOfBirth"),
  sex: text("sex"), // male|female|other
  weight: integer("weight"), // in lbs
  height: integer("height"), // in cm
  updatedAt: text("updatedAt").notNull(),
});