import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

import { initializeAppState } from "./domain/state";

function LoadingScreen() {
  return (
    <div className="w-full h-full flex items-center justify-center text-slate-500">
      Loading…
    </div>
  );
}

async function start() {
  const root = ReactDOM.createRoot(document.getElementById("root")!);

  // Temporary loading screen until we hydrate from the filesystem
  root.render(<LoadingScreen />);

  // Load Tauri-backed state.json
  await initializeAppState();

  // Now render the real UI
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}

start();