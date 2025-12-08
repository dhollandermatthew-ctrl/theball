import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// Tauri dev host support (optional)
const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },

  clearScreen: false,

  // Dev server for Tauri
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,

    watch: {
      // Ignore changes inside the Tauri Rust folder
      ignored: ["**/src-tauri/**"],
    },
  },

  // Build options (Tauri needs es2021 target)
  build: {
    target: ["es2021", "chrome100", "safari13"],
    minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
});