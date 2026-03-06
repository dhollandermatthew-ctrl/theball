// FILE: src/db/client.ts

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// Debug: Check if env vars are loaded
const dbUrl = import.meta.env.VITE_TURSO_DB_URL;
const dbToken = import.meta.env.VITE_TURSO_DB_TOKEN;

if (!dbUrl || !dbToken) {
  console.error('[DB] Missing database credentials!');
  console.error('[DB] URL:', dbUrl ? 'present' : 'MISSING');
  console.error('[DB] Token:', dbToken ? 'present' : 'MISSING');
  throw new Error('Database credentials not configured');
}

console.log('[DB] Initializing database connection...');
console.log('[DB] URL:', dbUrl);

// Connect to Turso using Vite env vars
export const client = createClient({
  url: dbUrl,
  authToken: dbToken,
});

// Export Drizzle ORM instance with full typed schema
export const db = drizzle(client, { schema });

console.log('[DB] Database client initialized');