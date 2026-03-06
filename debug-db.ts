// Debug script to check database contents
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { tasks as tasksTable } from './src/db/schema';

// Load env vars
config();

async function checkDatabase() {
  try {
    console.log("Checking database...");
    
    const client = createClient({
      url: process.env.VITE_TURSO_DB_URL!,
      authToken: process.env.VITE_TURSO_DB_TOKEN!,
    });
    
    const db = drizzle(client);
    const allTasks = await db.select().from(tasksTable);
    
    console.log(`\n✅ Total tasks in database: ${allTasks.length}`);
    
    if (allTasks.length > 0) {
      console.log("\n📋 First 5 tasks:");
      allTasks.slice(0, 5).forEach((task, i) => {
        console.log(`  ${i + 1}. ${task.title}`);
        console.log(`     Date: ${task.date}, Status: ${task.status}, Priority: ${task.priority}`);
      });
      
      const todayTasks = allTasks.filter(t => t.date === '2026-03-06');
      console.log(`\n📅 Tasks for today (2026-03-06): ${todayTasks.length}`);
    } else {
      console.log("\n⚠️  NO TASKS FOUND IN DATABASE!");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error checking database:", error);
    process.exit(1);
  }
}

checkDatabase();
