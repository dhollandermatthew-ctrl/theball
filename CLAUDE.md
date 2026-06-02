# CLAUDE.md — The Ball

## What the App Is

**The Ball** is a personal productivity desktop app built for a single user. It combines task/calendar management, goal tracking, 1:1 meeting notes, health tracking (bloodwork + workouts), meeting transcription and analysis, product knowledge storage, and an AI-powered quick-add voice feature — all in one native macOS window.

This is a **solo-user app by design**. There is no authentication, no multi-user logic, no login flow. All data belongs to one person.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri v2 (Rust) |
| Frontend | React 19, TypeScript |
| State management | Zustand 5 with Immer middleware |
| ORM | Drizzle ORM |
| Remote database | Turso (libSQL — hosted SQLite) |
| Build tool | Vite 6 |
| Styling | Tailwind CSS v3 |
| Drag-and-drop | @dnd-kit |
| AI (text) | Google Gemini (`@google/generative-ai`) |
| AI (transcription) | Groq Whisper API (via Tauri Rust command), AssemblyAI |
| Auto-updater | tauri-plugin-updater |

---

## How to Run

```bash
# Install dependencies
npm install

# Run in dev mode (REQUIRED — do NOT use `npm run dev` alone)
npm run tauri dev
```

`npm run dev` starts only the Vite frontend — the app will be missing all native Tauri features (file system, transcription, auto-update, etc.). Always use `npm run tauri dev` for development.

**Prerequisites:**
- Node.js 20+
- Rust (stable, 1.77.2+)
- A `.env` file at the project root with the variables listed below

---

## Environment Variables

Create a `.env` file in the project root (never commit it):

```
VITE_TURSO_DB_URL=libsql://your-db.turso.io
VITE_TURSO_DB_TOKEN=your-turso-token
VITE_GROQ_API_KEY=your-groq-key
VITE_ASSEMBLYAI_API_KEY=your-assemblyai-key
VITE_GEMINI_API_KEY=your-gemini-key
```

The app will throw at startup if `VITE_TURSO_DB_URL` or `VITE_TURSO_DB_TOKEN` are missing (see `src/db/client.ts`). The AI keys are only needed for their respective features (transcription, chat, health analysis).

All five variables are also stored as GitHub Actions secrets and baked into the release build at CI time (see `.github/workflows/release.yml`).

---

## Data Architecture

The app uses a **three-tier offline-first architecture**:

```
Zustand (in-memory)
   ↕  instant, synchronous
localStorage (offline cache)
   ↕  async, background
Turso (libSQL remote DB)
```

### On startup (`initializeAppState` in `src/domain/state.ts`)

1. **Step 1 (instant):** Load from `localStorage` via `loadFromLocalStorage()`. The UI becomes usable immediately — `hydrated` is set to `true`.
2. **Step 2 (background):** Connect to Turso, run any pending localStorage→Turso migrations, then replace in-memory state with the authoritative Turso data. Re-backup fresh data to `localStorage`.
3. **Step 3:** Register `online`/`offline` event listeners. When the device comes back online, `triggerSync()` flushes the pending queue.

### Write path

Every mutation (add/update/delete) in the Zustand store:
1. Updates Zustand immediately (optimistic)
2. Calls `backupToLocalStorage(...)` to persist the change locally
3. Calls `enqueue(change)` to add the change to the sync queue
4. The sync queue (`src/db/sync.ts`) flushes to Turso asynchronously. If offline, the queue is persisted to `localStorage` and retried with a 5-second backoff (max 5 retries, then kept for the next online event).

### Deduplication

The sync queue deduplicates by `${table}-${type}-${id}`, so rapid updates to the same record do not pile up.

---

## Native Tauri Commands

All commands are defined in `src-tauri/src/main.rs` and registered in the `invoke_handler`. These are **macOS-only** (the app only bundles as `.dmg`/`.app`).

| Command | Description |
|---|---|
| `transcribe_audio(audio: Vec<u8>, api_key: String)` | Sends audio bytes to Groq Whisper API (`whisper-large-v3`) and returns the transcript text. Has a 30-second timeout with specific offline/connect error messages. |
| `read_data_file()` | Reads `{app_data_dir}/state.json`. Returns `"{}"` if not found. |
| `write_data_file(contents: String)` | Writes to `{app_data_dir}/state.json`. Creates directories if needed. |
| `save_to_downloads(filename, content)` | Writes a file directly to `$HOME/Downloads/`. Returns the full path as a string. |
| `reveal_in_finder(path)` | Runs `open <path>` to reveal a file/folder in macOS Finder. |

---

## Database Schema

All tables are SQLite (via Turso/libSQL). Drizzle schema lives in `src/db/schema.ts`.

| Table | Description |
|---|---|
| `tasks` | Calendar and 1:1 tasks. `taskType` = `calendar` or `oneonone`. `starredDate`/`starredRank` for Daily Focus (max 3/day). |
| `one_on_one_people` | Contacts for 1:1 meetings. |
| `one_on_ones` | Individual 1:1 note items, linked to a person by `personId`. |
| `goals` | Goals with progress (0–100), dates, color, and `sort_order` for DnD ordering. |
| `meeting_spaces` | Named meeting contexts (e.g., "Team Standup"). `category`: tech/architecture/leadership/client. |
| `meeting_records` | Individual meeting records inside a space. `insight` is a JSON blob. |
| `space_notes` | Free-form notes attached to a meeting space. |
| `health_bloodwork` | Bloodwork records. `labValues` and `aiFlags` are stored as JSON strings. |
| `health_workouts` | Workout records (run/bike/walk/etc.). |
| `health_profile` | Singleton row (`id = "singleton"`) with personal stats (DOB, sex, weight, height). |
| `product_knowledge` | Notes and documents. `fileData` stores base64-encoded file bytes for documents. `tags` is a JSON array. |
| `transcripts` | Meeting/audio transcripts. `utterances` is a JSON array of `SpeakerUtterance` objects. `speakerNames` is a JSON object mapping speaker labels to names. |
| `prompts` | AI prompt log (user input + output). |
| `ai_logs` | AI event log with metadata. |

---

## Key Files Map

```
src/
  App.tsx                     — Top-level layout, view routing, global keyboard shortcuts
  main.tsx                    — React entry point
  domain/
    state.ts                  — Zustand store (all actions + initializeAppState)
    types.ts                  — All shared TypeScript types (single source of truth)
    utils.ts                  — generateId(), getRandomColor(), etc.
    ai/                       — AI integration (Gemini task extraction, meeting insights)
    audioRecording.ts         — Browser MediaRecorder wrapper
    nativeDictation.ts        — Calls Tauri transcribe_audio command
    recordingSession.ts       — Recording session state machine
    modelProvider.ts          — Gemini model initialization
    tokenTracker.ts           — Tracks Gemini token usage
    prompts/                  — Prompt templates
    fileStorage.ts            — Handles file reads for product knowledge
    extractText.ts            — Text extraction from PDFs, DOCX, PPTX
  db/
    client.ts                 — Turso/libSQL + Drizzle client setup
    schema.ts                 — Drizzle ORM table definitions
    sync.ts                   — Sync queue (enqueue, flush, triggerSync, getSyncStatus)
    offlineStorage.ts         — localStorage helpers (backup, load, queue persistence, isOnline)
    migrate-localStorage.ts   — One-time migration of old localStorage data to Turso
  components/
    Board.tsx                 — Calendar/task board (main view)
    Sidebar.tsx               — Left nav (views + 1:1 people)
    GoalView.tsx              — Goals with DnD reordering
    OneOnOneTaskView.tsx      — 1:1 notes + linked tasks
    MeetingHub.tsx            — Meeting spaces + records
    HealthView.tsx            — Bloodwork + workouts + profile
    ProductKnowledgeView.tsx  — Notes + documents library
    TranscriptsView.tsx       — Audio transcript viewer
    AITaskEntryModal.tsx      — AI quick-add (Cmd+Shift+N)
    UpdateChecker.tsx         — tauri-plugin-updater integration
    SyncStatusIndicator.tsx   — Visual indicator for pending sync queue
src-tauri/
  src/main.rs                 — All Rust Tauri commands
  Cargo.toml                  — Rust dependencies
  tauri.conf.json             — App config, bundle targets, updater endpoint
  entitlements.plist          — macOS entitlements (needed for network access in release)
  Info.plist                  — macOS app metadata
.github/workflows/release.yml — CI/CD release pipeline
```

---

## Releasing

The release process is fully automated via GitHub Actions:

```bash
git tag v0.2.0
git push origin v0.2.0
```

This triggers `.github/workflows/release.yml` which:
1. Installs Node + Rust on `macos-latest`
2. Runs `npm ci`
3. Calls `tauri-action` which builds and signs the `.dmg` and `.app`
4. Publishes to GitHub Releases with a `latest.json` updater manifest

The app checks for updates on launch via `tauri-plugin-updater`. The update endpoint is:
```
https://github.com/dhollandermatthew-ctrl/theball/releases/latest/download/latest.json
```

The signing key (`TAURI_SIGNING_PRIVATE_KEY`) and all `VITE_*` env vars must be set as GitHub Actions secrets before releasing. The public key is baked into `tauri.conf.json`.

---

## Things to Be Careful About

**Single-user app — no auth.** There is intentionally no login, no user ID, no row-level security. Do not add multi-user abstractions.

**localStorage is machine-local.** The offline cache in localStorage is tied to the specific machine/browser profile where the app runs. It is not a sync target — Turso is. Do not treat localStorage as the source of truth; it is a read-ahead cache.

**Env vars are baked into the frontend bundle.** `VITE_*` variables are inlined by Vite at build time. Anyone who extracts the `.app` bundle can read the Turso token. This is acceptable for a single-user personal app but means the Turso token should only grant access to this one database.

**macOS-only native commands.** `save_to_downloads` uses `$HOME/Downloads`, and `reveal_in_finder` uses `open`. Both assume macOS. The app only targets `dmg`/`app` bundles.

**Tauri v2 capabilities.** The CSP is set to `null` (disabled) in `tauri.conf.json`. The capabilities block controls which Tauri APIs the frontend can call. If you add a new plugin, you must add its permission string to the capabilities array.

**JSON fields in Turso.** Several columns store JSON-serialized data (`labValues`, `aiFlags`, `utterances`, `speakerNames`, `insight`, `tags`). When reading from Turso, these must be `JSON.parse()`d. When writing, they must be `JSON.stringify()`d. This is handled in `state.ts` and `sync.ts` — do not bypass it.

**State version.** `CURRENT_STATE_VERSION = 5` in `state.ts`. If you make a breaking schema change, increment this and add a migration in `migrate-localStorage.ts`.

**DevTools auto-open in debug builds.** In `main.rs`, dev builds automatically open the webview devtools. This is intentional.

**`window.store` is exposed globally** for debugging (`(window as any).store = useAppStore` at the bottom of `state.ts`).
