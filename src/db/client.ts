// FILE: src/db/client.ts

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// Connect to Turso using Vite env vars
export const client = createClient({
  url: import.meta.env.VITE_TURSO_DB_URL!,
  authToken: import.meta.env.VITE_TURSO_DB_TOKEN!,
});

// Export Drizzle ORM instance with full typed schema
export const db = drizzle(client, { schema });