// Debug script to check database contents
import { db } from "./src/db/client";
import { tasks as tasksTable } from "./src/db/schema";

async function checkDatabase() {
  try {
    console.log("Checking database...");
    
    const allTasks = await db.select().from(tasksTable);
    
    console.log(`Total tasks in database: ${allTasks.length}`);
    
    if (allTasks.length > 0) {
      console.log("\nFirst 5 tasks:");
      allTasks.slice(0, 5).forEach((task, i) => {
        console.log(`${i + 1}. ${task.title} - Date: ${task.date}, Status: ${task.status}`);
      });
    } else {
      console.log("\n⚠️  NO TASKS FOUND IN DATABASE!");
    }
    
  } catch (error) {
    console.error("Error checking database:", error);
  }
}

checkDatabase();
