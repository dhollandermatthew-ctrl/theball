const { drizzle } = require('drizzle-orm/libsql');
const { createClient } = require('@libsql/client');

const dbUrl = process.env.TURSO_DATABASE_URL;
const dbToken = process.env.TURSO_AUTH_TOKEN;
const client = createClient({ url: dbUrl, authToken: dbToken });
const db = drizzle(client);

(async () => {
  const tasks = await client.execute('SELECT id, title, content, priority, status, date, category FROM tasks ORDER BY date DESC LIMIT 100');
  
  // Analyze task patterns
  const withContent = tasks.rows.filter(t => t.content && t.content !== '<p><br></p>');
  const withoutContent = tasks.rows.filter(t => !t.content || t.content === '<p><br></p>');
  
  console.log('=== TASK ANALYSIS ===');
  console.log('Total tasks analyzed:', tasks.rows.length);
  console.log('Tasks WITH descriptions:', withContent.length, '(' + Math.round(withContent.length/tasks.rows.length*100) + '%)');
  console.log('Tasks WITHOUT descriptions:', withoutContent.length, '(' + Math.round(withoutContent.length/tasks.rows.length*100) + '%)');
  console.log('');
  
  console.log('=== SAMPLE TASKS WITH DESCRIPTIONS ===');
  withContent.slice(0, 5).forEach(t => {
    console.log('Title:', t.title);
    console.log('Content:', t.content.substring(0, 150));
    console.log('Priority:', t.priority, '| Status:', t.status, '| Date:', t.date);
    console.log('---');
  });
  
  console.log('');
  console.log('=== SAMPLE TASKS WITHOUT DESCRIPTIONS ===');
  withoutContent.slice(0, 10).forEach(t => {
    console.log('Title:', t.title, '| P' + t.priority.toUpperCase(), '| Date:', t.date);
  });
})();
