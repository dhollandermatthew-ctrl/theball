// FILE: src/db/schema.ts
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// -----------------------------------------------------
// TASKS TABLE
// -----------------------------------------------------
export const tasks = sqliteTable("tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull().default("New Task"),
  content: text("content").notNull(),
  date: text("date").notNull(),

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