import { createClient } from '@libsql/client/web';

const db = createClient({
  url: import.meta.env.VITE_TURSO_DB_URL,
  authToken: import.meta.env.VITE_TURSO_DB_TOKEN,
});

export interface NewTask {
  id: string;
  title: string;
  date: string;
  priority: 'p1' | 'p2' | 'p3';
  category: 'work' | 'personal';
}

export async function insertTask(task: NewTask): Promise<void> {
  await db.execute({
    sql: `INSERT INTO tasks (id, title, status, priority, category, date, taskType, content, createdAt, updatedAt)
          VALUES (?, ?, 'todo', ?, ?, ?, 'calendar', '', ?, ?)`,
    args: [
      task.id,
      task.title,
      task.priority,
      task.category,
      task.date,
      new Date().toISOString(),
      new Date().toISOString(),
    ],
  });
}

export async function getRecentTasks(limit = 8): Promise<NewTask[]> {
  const result = await db.execute({
    sql: `SELECT id, title, date, priority, category FROM tasks
          WHERE taskType = 'calendar' AND status = 'todo'
          ORDER BY createdAt DESC LIMIT ?`,
    args: [limit],
  });
  return result.rows as unknown as NewTask[];
}
