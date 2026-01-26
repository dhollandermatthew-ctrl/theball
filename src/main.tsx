// FILE: src/main.tsx
// React entrypoint for Vite + Tauri

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { initializeAppState } from "./domain/state";

// ---- DB TEST IMPORTS (safe in dev only) ----
import { db } from "./db/client";
import { tasks } from "./db/schema";
import "@/db/sync";

// -------------------------------------------------------
// Async bootstrap wrapper (fix for top-level await error)
// -------------------------------------------------------
async function start() {
  // 1) Initialize Zustand state BEFORE React renders
  await initializeAppState();

  // 2) Debug env vars in dev
  if (import.meta.env.DEV) {

    db.select()
    .from(tasks)
    .then((rows) => {
      console.log("DB test OK, rows:", rows.length);
    })
    .catch((err) => {
      console.error("DB test failed", err);
    });

  }

  // 4) Render React app AFTER hydration
  const rootEl = document.getElementById("root") as HTMLElement;

  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

// Start the async bootstrap
start();