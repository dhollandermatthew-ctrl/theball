/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TURSO_DB_URL: string;
  readonly VITE_TURSO_DB_TOKEN: string;
  readonly VITE_GEMINI_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
