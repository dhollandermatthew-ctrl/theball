// FILE: src/db/sync.ts
import { db } from "@/db/client";
import {
  tasks,
  oneOnOnes,
  oneOnOnePeople,
  prompts,
  aiLogs,
  goals,
  meetingSpaces,
  meetingRecords,
  spaceNotes,
  healthBloodwork,
  healthWorkouts,
  healthProfile,
  productKnowledge,
} from "@/db/schema";
import { eq } from "drizzle-orm";

type Change =
  // TASKS
  | { type: "insert"; table: "tasks"; data: any }
  | { type: "update"; table: "tasks"; id: string; data: any }
  | { type: "delete"; table: "tasks"; id: string }
  // GOALS
  | { type: "insert"; table: "goals"; data: any }
  | { type: "update"; table: "goals"; id: string; data: any }
  | { type: "delete"; table: "goals"; id: string }
  // 1:1 NOTES
  | { type: "insert"; table: "oneOnOnes"; data: any }
  | { type: "update"; table: "oneOnOnes"; id: string; data: any }
  | { type: "delete"; table: "oneOnOnes"; id: string }
  // 1:1 PEOPLE
  | { type: "insert"; table: "oneOnOnePeople"; data: any }
  | { type: "update"; table: "oneOnOnePeople"; id: string; data: any }
  | { type: "delete"; table: "oneOnOnePeople"; id: string }
  // PROMPTS / AI LOGS
  | { type: "insert"; table: "prompts"; data: any }
  | { type: "insert"; table: "aiLogs"; data: any }
  // MEETINGS
  | { type: "insert"; table: "meetingSpaces"; data: any }
  | { type: "update"; table: "meetingSpaces"; id: string; data: any }
  | { type: "delete"; table: "meetingSpaces"; id: string }
  | { type: "insert"; table: "meetingRecords"; data: any }
  | { type: "update"; table: "meetingRecords"; id: string; data: any }
  | { type: "delete"; table: "meetingRecords"; id: string }
  | { type: "insert"; table: "spaceNotes"; data: any }
  | { type: "update"; table: "spaceNotes"; id: string; data: any }
  | { type: "delete"; table: "spaceNotes"; id: string }
  // HEALTH
  | { type: "insert"; table: "healthBloodwork"; data: any }
  | { type: "update"; table: "healthBloodwork"; id: string; data: any }
  | { type: "delete"; table: "healthBloodwork"; id: string }
  | { type: "insert"; table: "healthWorkouts"; data: any }
  | { type: "update"; table: "healthWorkouts"; id: string; data: any }
  | { type: "delete"; table: "healthWorkouts"; id: string }
  | { type: "upsert"; table: "healthProfile"; id: string; data: any }
  // PRODUCT KNOWLEDGE
  | { type: "insert"; table: "productKnowledge"; data: any }
  | { type: "update"; table: "productKnowledge"; id: string; data: any }
  | { type: "delete"; table: "productKnowledge"; id: string };

const queue: Change[] = [];
let flushing = false;

export function enqueue(change: Change) {
  queue.push(change);
  flush();
}

async function flush() {
  if (flushing || queue.length === 0) return;

  flushing = true;

  try {
    while (queue.length > 0) {
      const change = queue.shift()!;
      await apply(change);
    }
  } finally {
    flushing = false;
  }
}

async function apply(change: Change) {
  switch (change.table) {
    // ---------------- TASKS ----------------
    case "tasks":
      if (change.type === "insert") {
        return db.insert(tasks).values(change.data);
      }
      if (change.type === "update") {
        return db
          .update(tasks)
          .set(change.data)
          .where(eq(tasks.id, change.id));
      }
      if (change.type === "delete") {
        return db.delete(tasks).where(eq(tasks.id, change.id));
      }
      break;


        // ---------------- GOALS ----------------
        case "goals":
          if (change.type === "insert") {
            return db.insert(goals).values(change.data);
          }
          if (change.type === "update") {
            return db
              .update(goals)
              .set(change.data)
              .where(eq(goals.id, change.id));
          }
          if (change.type === "delete") {
            return db.delete(goals).where(eq(goals.id, change.id));
          }
          break;

    // ---------------- 1:1 NOTES ----------------
    case "oneOnOnes":
      if (change.type === "insert") {
        return db.insert(oneOnOnes).values(change.data);
      }
      if (change.type === "update") {
        return db
          .update(oneOnOnes)
          .set(change.data)
          .where(eq(oneOnOnes.id, change.id));
      }
      if (change.type === "delete") {
        return db.delete(oneOnOnes).where(eq(oneOnOnes.id, change.id));
      }
      break;

    // ---------------- 1:1 PEOPLE ----------------
    case "oneOnOnePeople":
      if (change.type === "insert") {
        return db.insert(oneOnOnePeople).values(change.data);
      }
      if (change.type === "update") {
        return db
          .update(oneOnOnePeople)
          .set(change.data)
          .where(eq(oneOnOnePeople.id, change.id));
      }
      if (change.type === "delete") {
        return db.delete(oneOnOnePeople).where(eq(oneOnOnePeople.id, change.id));
      }
      break;

    // ---------------- PROMPTS ----------------
    case "prompts":
      if (change.type === "insert") {
        return db.insert(prompts).values(change.data);
      }
      break;

    // ---------------- AI LOGS ----------------
    case "aiLogs":
      if (change.type === "insert") {
        return db.insert(aiLogs).values(change.data);
      }
      break;

    // ---------------- MEETINGS ----------------
    case "meetingSpaces":
      if (change.type === "insert") {
        return db.insert(meetingSpaces).values(change.data);
      }
      if (change.type === "update") {
        return db
          .update(meetingSpaces)
          .set(change.data)
          .where(eq(meetingSpaces.id, change.id));
      }
      if (change.type === "delete") {
        return db.delete(meetingSpaces).where(eq(meetingSpaces.id, change.id));
      }
      break;

    case "meetingRecords":
      if (change.type === "insert") {
        return db.insert(meetingRecords).values(change.data);
      }
      if (change.type === "update") {
        return db
          .update(meetingRecords)
          .set(change.data)
          .where(eq(meetingRecords.id, change.id));
      }
      if (change.type === "delete") {
        return db.delete(meetingRecords).where(eq(meetingRecords.id, change.id));
      }
      break;

    case "spaceNotes":
      if (change.type === "insert") {
        return db.insert(spaceNotes).values(change.data);
      }
      if (change.type === "update") {
        return db
          .update(spaceNotes)
          .set(change.data)
          .where(eq(spaceNotes.id, change.id));
      }
      if (change.type === "delete") {
        return db.delete(spaceNotes).where(eq(spaceNotes.id, change.id));
      }
      break;

    // ---------------- HEALTH ----------------
    case "healthBloodwork":
      if (change.type === "insert") {
        return db.insert(healthBloodwork).values(change.data);
      }
      if (change.type === "update") {
        return db
          .update(healthBloodwork)
          .set(change.data)
          .where(eq(healthBloodwork.id, change.id));
      }
      if (change.type === "delete") {
        return db.delete(healthBloodwork).where(eq(healthBloodwork.id, change.id));
      }
      break;

    case "healthWorkouts":
      if (change.type === "insert") {
        return db.insert(healthWorkouts).values(change.data);
      }
      if (change.type === "update") {
        return db
          .update(healthWorkouts)
          .set(change.data)
          .where(eq(healthWorkouts.id, change.id));
      }
      if (change.type === "delete") {
        return db.delete(healthWorkouts).where(eq(healthWorkouts.id, change.id));
      }
      break;

    case "healthProfile":
      if (change.type === "upsert") {
        // Upsert: try update first, insert if not exists
        const existing = await db
          .select()
          .from(healthProfile)
          .where(eq(healthProfile.id, change.id));

        if (existing.length > 0) {
          return db
            .update(healthProfile)
            .set(change.data)
            .where(eq(healthProfile.id, change.id));
        } else {
          return db.insert(healthProfile).values(change.data);
        }
      }
      break;

    // ---------------- PRODUCT KNOWLEDGE ----------------
    case "productKnowledge":
      if (change.type === "insert") {
        return db.insert(productKnowledge).values(change.data);
      }
      if (change.type === "update") {
        return db
          .update(productKnowledge)
          .set(change.data)
          .where(eq(productKnowledge.id, change.id));
      }
      if (change.type === "delete") {
        return db.delete(productKnowledge).where(eq(productKnowledge.id, change.id));
      }
      break;

    default:
      throw new Error("Unknown table in sync: " + (change as any).table);
  }
}