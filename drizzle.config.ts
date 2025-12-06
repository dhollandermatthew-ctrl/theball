import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",

  dialect: "turso", // ✅ This is what YOUR drizzle version expects

  dbCredentials: {
    url: process.env.VITE_TURSO_DB_URL!,
    authToken: process.env.VITE_TURSO_DB_TOKEN!,
  },
});