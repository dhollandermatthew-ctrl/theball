// Migration script: localStorage → Turso
// Runs once on app initialization to migrate existing data

import type { MeetingSpace, HealthData } from "@/domain/types";
import { db } from "@/db/client";
import {
  meetingSpaces,
  meetingRecords,
  spaceNotes,
  healthBloodwork,
  healthWorkouts,
  healthProfile,
} from "@/db/schema";

const MIGRATION_FLAG_KEY = "theball-migration-completed";

export async function migrateLocalStorageToTurso(): Promise<void> {
  // Check if migration already completed
  if (localStorage.getItem(MIGRATION_FLAG_KEY) === "true") {
    console.log("[Migration] Already completed, skipping");
    return;
  }

  console.log("[Migration] Starting localStorage → Turso migration...");

  try {
    await migrateMeetings();
    await migrateHealth();

    // Mark migration as complete
    localStorage.setItem(MIGRATION_FLAG_KEY, "true");
    console.log("[Migration] ✅ Complete!");
  } catch (error) {
    console.error("[Migration] ❌ Failed:", error);
    throw error;
  }
}

async function migrateMeetings() {
  const raw = localStorage.getItem("theball-meetings");
  if (!raw) {
    console.log("[Migration] No meetings data found");
    return;
  }

  try {
    const spaces: MeetingSpace[] = JSON.parse(raw);
    console.log(`[Migration] Migrating ${spaces.length} meeting spaces...`);

    for (let i = 0; i < spaces.length; i++) {
      const space = spaces[i];
      // Insert space (skip if already exists)
      await db.insert(meetingSpaces).values({
        id: space.id,
        name: space.name,
        description: space.description,
        category: space.category,
        color: space.color,
        sortOrder: i,
        createdAt: new Date().toISOString(),
      }).onConflictDoNothing();

      // Insert records
      if (space.records && space.records.length > 0) {
        for (const record of space.records) {
          await db.insert(meetingRecords).values({
            id: record.id,
            spaceId: space.id,
            title: record.title,
            date: record.date,
            transcript: record.transcript || "",
            notes: record.notes || null,
            meetingType: record.meetingType || null,
            insight: record.insight ? JSON.stringify(record.insight) : null,
            createdAt: record.createdAt,
          }).onConflictDoNothing();
        }
      }

      // Insert space notes
      if (space.spaceNotes && space.spaceNotes.length > 0) {
        for (const note of space.spaceNotes) {
          await db.insert(spaceNotes).values({
            id: note.id,
            spaceId: space.id,
            title: note.title,
            content: note.content || " ", // Handle empty content from legacy data
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
          }).onConflictDoNothing();
        }
      }
    }

    console.log(`[Migration] ✅ ${spaces.length} meeting spaces migrated`);
  } catch (error) {
    console.error("[Migration] Error migrating meetings:", error);
    throw error;
  }
}

async function migrateHealth() {
  const raw = localStorage.getItem("theball-health");
  if (!raw) {
    console.log("[Migration] No health data found");
    return;
  }

  try {
    const data: HealthData = JSON.parse(raw);
    
    // Migrate bloodwork records
    if (data.bloodWorkRecords && data.bloodWorkRecords.length > 0) {
      console.log(`[Migration] Migrating ${data.bloodWorkRecords.length} bloodwork records...`);
      
      for (const record of data.bloodWorkRecords) {
        await db.insert(healthBloodwork).values({
          id: record.id,
          date: record.date,
          labName: record.labName || null,
          sourceType: record.sourceType,
          sourceFileName: record.sourceFileName || null,
          labValues: JSON.stringify(record.labValues),
          aiAnalysis: record.aiAnalysis || null,
          aiFlags: record.aiFlags ? JSON.stringify(record.aiFlags) : null,
          notes: record.notes || null,
          createdAt: record.createdAt,
        }).onConflictDoNothing();
      }
    }

    // Migrate workout records
    if (data.workoutRecords && data.workoutRecords.length > 0) {
      console.log(`[Migration] Migrating ${data.workoutRecords.length} workout records...`);
      
      for (const record of data.workoutRecords) {
        await db.insert(healthWorkouts).values({
          id: record.id,
          date: record.date,
          type: record.type,
          distance: record.distance || null,
          duration: record.duration || null,
          pace: record.pace || null,
          calories: record.calories || null,
          sourceType: record.sourceType,
          sourceFileName: record.sourceFileName || null,
          notes: record.notes || null,
          createdAt: record.createdAt,
        }).onConflictDoNothing();
      }
    }

    // Migrate personal profile
    if (data.personalProfile) {
      console.log("[Migration] Migrating health profile...");
      
      await db.insert(healthProfile).values({
        id: "singleton",
        dateOfBirth: data.personalProfile.dateOfBirth || null,
        sex: data.personalProfile.sex || null,
        weight: data.personalProfile.weight || null,
        height: data.personalProfile.height || null,
        updatedAt: new Date().toISOString(),
      }).onConflictDoNothing();
    }

    console.log("[Migration] ✅ Health data migrated");
  } catch (error) {
    console.error("[Migration] Error migrating health data:", error);
    throw error;
  }
}
