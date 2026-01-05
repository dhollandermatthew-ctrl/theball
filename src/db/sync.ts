// FILE: src/db/sync.ts
import { db } from "@/db/client";
import {
  tasks,
  oneOnOnes,
  oneOnOnePeople,
  prompts,
  aiLogs,
  goals,
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
  | { type: "insert"; table: "aiLogs"; data: any };

const queue: Change[] = [];
let flushing = false;

export function enqueue(change: Change) {
  queue.push(change);
  flush();
}

async function flush() {
  if (flushing || queue.length === 0) return;

  flushing = true;

  while (queue.length > 0) {
    const change = queue.shift()!;
    try {
      await apply(change);
    } catch (err) {
      // put it back and bail, so we don't spin forever
      queue.push(change);
      break;
    }
  }

  flushing = false;
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

    default:
      throw new Error("Unknown table in sync: " + (change as any).table);
  }
}