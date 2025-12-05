// FILE: src/main.tsx
// React entrypoint for Vite + Tauri

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { initializeAppState } from "./domain/state";

// -------------------------------------------------------
// 1) Initialize Zustand state BEFORE React renders
// -------------------------------------------------------
await initializeAppState();

// -------------------------------------------------------
// 2) Debug env vars in dev (optional)
// -------------------------------------------------------
if (import.meta.env.DEV) {
  console.log("VITE_TURSO_DB_URL:", import.meta.env.VITE_TURSO_DB_URL);
  console.log("VITE_TURSO_DB_TOKEN:", import.meta.env.VITE_TURSO_DB_TOKEN);
}

// -------------------------------------------------------
// 3) Render React app
// -------------------------------------------------------
const rootEl = document.getElementById("root") as HTMLElement;

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);