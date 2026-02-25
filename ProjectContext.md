The Ball — Complete AI Context Document
Version: 2.2 (Product Knowledge Repository)
Status: Canonical (Updated February 23, 2026)
Owner: Matthew D'Hollander
Purpose: Full grounding context for AI systems interacting with The Ball project

---

## Changelog

**Version 2.2 (February 23, 2026) — Product Knowledge Repository**

- **NEW FEATURE**: Product Knowledge Repository for PM learning capture
- Added `product_knowledge` table to Turso (Base64 file storage for multi-device sync)
- Created text extraction utilities: `src/domain/extractText.ts` (pdf-parse, mammoth)
- Created file storage utilities: `src/domain/fileStorage.ts` (Base64 encoding/decoding)
- Extended Zustand store with 3 CRUD actions: `addKnowledgeItem`, `updateKnowledgeItem`, `deleteKnowledgeItem`
- Built ProductKnowledgeView component with search, tag filtering, upload, and modals
- **Use Case**: Store and recall PM knowledge (competitor research, frameworks, presentations)
- **Organization**: Tag-based only (no folders), client-side search
- **Storage**: Base64-encoded files in Turso for automatic multi-device sync
- **V1 Scope**: PDF/DOCX text extraction, quick notes with WYSIWYG, no OCR for images

**Version 2.1 (February 23, 2026) — Multi-Device Sync Architecture**

- **BREAKING**: Migrated meetings and health data from localStorage to Turso
- Added 6 new Turso tables: `meeting_spaces`, `meeting_records`, `space_notes`, `health_bloodwork`, `health_workouts`, `health_profile`
- Implemented queue-based sync layer (`src/db/sync.ts`) for all CRUD operations
- Extended Zustand store with 15+ actions for meetings and health management
- One-time migration script with idempotent conflict handling
- Refactored MeetingHub, MeetingSpaceView, HealthView to use Zustand (removed prop drilling)
- Added `sortOrder` field for drag-and-drop persistence in meeting spaces
- **Impact**: The Ball now supports multi-device access—open on any computer and see all data
- **AI Query Ready**: All meeting and health data now queryable via Turso for AI agents

---

1. Product Definition
   The Ball is a personal operating system for execution, thinking, and memory.

It centralizes:

Daily task control
Meeting intelligence
Health tracking & longitudinal awareness
Contextual execution
Long-term pattern awareness
Primary Goal: Reduce cognitive overhead while increasing precision, follow-through, and clarity.

Single-user system. Built exclusively for Matthew D'Hollander. No multi-user abstractions, no collaboration features, no generalization for market fit.

2. Reference Model
   Closest analog: Notion Calendar

What's adopted:

Daily task visibility
Time-based prioritization
Execution-oriented workflow
What's added:

Real memory across meetings and tasks
Understanding of meeting context
Task-level intelligence
Health data tracking with AI extraction
Longitudinal pattern awareness 3. Core Product Pillars
3.1 Daily Execution Control (Primary — 80% of The Ball)
This is THE core feature. Everything else supports this execution loop.

The Reality:

Matthew operates in a meeting-heavy environment with high context switching
15+ tasks captured per day via voice-to-text (Web Speech API)
Constant capture throughout the day as requests arrive
P1/P2/P3 prioritization based on urgency (focus on P1s and P2s)
Daily triage: Can't complete today? Move to next day or later in week
Work vs Personal calendar categories (separate contexts)
Sunday reorganization: 12+ tasks to sort and plan for the week
The system used to:

Track daily tasks (calendar view)
Manage 1-on-1 conversations and follow-ups
Quick voice capture between meetings
Prioritize what matters today
Execute with full context
Principles:

Tasks are time-aware
Tasks are context-rich
Tasks can be instantly improved with AI
Execution requires no tool switching
Voice capture eliminates friction (Web Speech API integration)
Before executing any task, The Ball provides:

Why it exists
Where it came from (meeting, 1-on-1, goal)
What decisions affect it
What constraints matter

3.2 Meeting Intelligence & Conversational Memory (Primary)
Meetings are treated as data, not notes.

Source of truth for:

Meeting transcripts
Summaries (decisions, learnings, follow-ups, open questions)
Discovery call insights (feature requests, problem signals)
Recurring themes
Organization: Meetings grouped into Spaces (e.g., "Client Discovery," "Tech Architecture")

Capabilities within a Space:

Query across all meetings with AI agent
Add persistent notes to spaces
Reflect on how thinking evolved
Identify contradictions or drift
Generate concise summaries on demand
This is conversational analysis, not journaling.

3.3 Health Tracking & Longitudinal Awareness (Secondary — 20%)
Health data is first-class, not an afterthought. Driven by Matthew's neurotic, data-driven personality.

Current State (February 2026):

Basic implementation: Upload blood tests, view trends over time
Minimal feature set currently (focus is on task management)
Will expand significantly when core functionality is stable
Tracks:

Blood work results (extracted from lab PDFs via AI vision)
Fitness records (extracted from workout screenshots via AI vision)
Trends over time with AI-generated insights
Why it exists:

Health affects execution capacity
Patterns emerge slowly (need longitudinal view)
Manual data entry is a blocker (AI extraction solves this)
Matthew's personality demands data-driven health awareness
Principles:

Upload → Extract → Analyze (automated pipeline)
AI handles vision parsing, user handles decisions
Historical data preserved for trend analysis
Future Expansions:

More health metrics and tracking features
Finance tracking
Other personal data systems

3.3.1 Product Knowledge Repository (Secondary — New Feb 2026)
A searchable repository of all product management knowledge accumulated over Matthew's career.

The Reality:

PM work requires deep research on competitors, frameworks, AI tools, presentation techniques
Knowledge scattered across Google Docs, Downloads folder, email attachments
Critical insights get lost and need to be rediscovered
When preparing for research or competitor analysis, Matthew needs instant recall: "I made a note at one time about Google Deep Research..."
Use Cases:

Store competitor research documents (PDFs, presentations, Word docs)
Capture learning from articles, frameworks, PM best practices
Quick notes on AI tools, frameworks, methodologies
Tag-based organization for cross-cutting PM knowledge
Full-text search across all documents and notes
Multi-device sync (same as meetings/health)
Design Principles:

This is ACTIVE learning capture, not passive archiving
Tags over folders (PM knowledge is cross-cutting, not hierarchical)
Upload → Extract → Search (frictionless pipeline)
Base64 file storage in Turso (automatic multi-device sync)
Client-side filtering (fast, no server calls)
Capabilities:

Quick Notes: WYSIWYG editor for capturing insights on the fly
Document Upload: PDF, DOCX, images (metadata only for images in V1)
Text Extraction: Automated via pdf-parse (PDF) and mammoth (DOCX)
Search: Filter by title, content, or tags (client-side, instant)
Tag Cloud: Visual tag filtering (multi-select AND logic)
Download: Retrieve original documents from any device
V1 Limitations (Intentional):

No OCR for images (metadata-only storage)
No AI-powered tagging suggestions (manual tags only)
No folders (tags only)
No collaborative features (single-user system)
Future Expansions:

AI-powered semantic search
Auto-tagging via LLM analysis
Summarization of long documents
Cross-referencing with meeting spaces (e.g., "All knowledge related to competitor X")

3.4 Thinking & Reflection (Supporting)
Reflection exists to:

Improve decision quality
Surface patterns
Reduce mental noise
Support self-regulation under pressure
Critical: Reflection is always in service of execution. Never replaces action. Never becomes self-referential.

4. Core Operating Loop
   Capture → Organize → Distill → Execute → Learn

Capture: meetings, tasks, thoughts
Organize: spaces + time
Distill: summaries, decisions, insights
Execute: daily work with preloaded context
Learn: longitudinal patterns
All functionality must reinforce this loop.

5. Data & Memory Philosophy
   Raw inputs (transcripts, logs): append-only, never overwritten
   Historical data: immutable
   Summaries: may evolve
   Decisions/commitments: immutable once recorded
   Time: first-class dimension
   System improves as more history accumulates.

6. Agent Philosophy (Critical for AI)
   Agents assist, they do not decide
   Autonomy is scoped and explicit
   No silent assumptions
   No invented certainty
   Agents: compress, connect, summarize, question
   Execution authority always remains with the user.

7. Architecture & Technical Stack
   7.1 Core Platform
   Desktop Application:

Tauri 2.9.4 (Rust-based desktop framework)
Native macOS app with system-level integration
Cross-platform capable (macOS primary target)
7.2 Frontend
Tech Stack:

React 18
TypeScript
Vite (build tool)
Tailwind CSS for styling
Lucide React for icons
Zustand for state management
Web Speech API for voice-to-text capture
Component Architecture:

Task management (Board, Column, TaskCard)
1-on-1 conversations (OneOnOneTaskView)
Meeting spaces (MeetingHub, MeetingSpaceView, SpaceChatPanel)
Health tracking (HealthView with AI extraction)
Product knowledge repository (ProductKnowledgeView with upload/search/tag filtering)
WYSIWYG editor (WysiwygEditor) with AI polish toolbar (EditorToolbar)
Cross-app search (SearchModal)
Goals tracking (GoalView, GoalCard, GoalTimeline) — being sunset

Utility Modules:

Text extraction (`src/domain/extractText.ts`): PDF/DOCX parsing via pdf-parse and mammoth
File storage (`src/domain/fileStorage.ts`): Base64 encoding/decoding, download helpers
7.3 Data Layer
Primary Storage:

Turso (SQLite) via Drizzle ORM for all structured data:
Tasks (calendar + 1-on-1)
Goals (being sunset)
People (1-on-1 tracking)
**NEW (Feb 2026): Meeting spaces, records, and notes**
**NEW (Feb 2026): Health data (blood work, fitness, profile)**
**NEW (Feb 2026): Product knowledge (documents + notes with Base64 file storage)**
localStorage for ephemeral/settings data only:
App settings (UI preferences, zoom, sidebar state)
Token usage history
AI model preference
Migration flag (`theball-migration-completed`)
Data Sync Architecture:

Drizzle ORM 0.45.0 for schema management
Queue-based sync layer (`src/db/sync.ts`)
All CRUD operations enqueued and flushed to Turso
`onConflictDoNothing()` for idempotent operations
Client-side only (no server)
Immediate persistence model with async flush
7.4 AI Integration
Primary AI Services:

Google Gemini 2.0 Flash (vision + text)
15-20 requests/minute free tier
Currently used for vision AND text tasks
Runs out approximately 1 in 10 days due to rate limits
Ollama (local text model)
Local LLM inference
Used as alternative text provider
Groq (text-only, high-speed) — PLANNED, NOT YET IMPLEMENTED
Intended to be primary text provider
Will solve Gemini rate limiting issues
Future state: Groq for ALL text, Gemini for vision only
Model Provider Pattern:

Global state management for AI selection (src/domain/modelProvider.ts)
User-controlled dropdown (currently Gemini | Ollama)
Token tracking (24-hour rolling window)
Graceful fallback between providers
AI Usage Patterns by Type:

Vision (Gemini only):

Blood work extraction from PDFs
Fitness data from workout screenshots
Future: whiteboard/diagram capture

Text (Current: Gemini/Ollama | Planned: Groq):

Task rewrites (highest frequency — constant daily usage)
Meeting summarization (both normal and discovery calls)
Space Q&A agent (query across meetings within a space)
Health analysis generation
Content polish toolbar (WYSIWYG editor integration)
Task reflection and improvement

7.5 Data Schema (Key Entities)
Core Tables (Turso):

**tasks**: Execution units with time/priority/status
CRITICAL: Every task has `category: "work" | "personal"` field
This split is architectural - affects all task features
Subtypes: calendar tasks (date-based), 1-on-1 tasks (conversation-linked)

**goals**: Progress tracking with timeline (being sunset)

**people**: 1-on-1 conversation partners

**NEW (Feb 2026) — Meeting Intelligence Tables:**

**meeting_spaces**: Organization containers for meetings
Fields: id, name, description, createdAt, sortOrder (nullable)
sortOrder enables drag-and-drop persistence (auto-assigned on app init)

**meeting_records**: Individual meeting transcripts and metadata
Fields: id, spaceId (FK to meeting_spaces), title, date, transcript, insights (JSON: decisions, learnings, followUps, openQuestions, discoveryMode with featureRequests/problemSignals if applicable), sourceType, sourceFileName, createdAt

**space_notes**: Persistent notes within a space
Fields: id, spaceId (FK to meeting_spaces), content (rich text), createdAt, updatedAt

**NEW (Feb 2026) — Health Tracking Tables:**

**health_bloodwork**: Lab results with AI-extracted values
Fields: id, date, labName, labValues (JSON array), sourceType, sourceFileName, notes, aiAnalysis (text), aiFlags (JSON array of concerns), createdAt

**health_workouts**: Fitness data with AI-extracted metrics
Fields: id, date, workoutType, durationMinutes, distance, distanceUnit, pace, avgHeartRate, zones (JSON), notes, sourceType, sourceFileName, aiAnalysis (text), createdAt

**health_profile**: Personal health context for AI analysis
Fields: id, age, sex, heightCm, weightKg, goals (text), conditions (text), medications (text), updatedAt

**NEW (Feb 2026) — Product Knowledge Table:**

**product_knowledge**: PM learning repository with documents and notes
Fields: id, title, type ('note' | 'document'), content (extracted text or note content), fileData (Base64-encoded file for documents), fileName, fileType (MIME type), fileSize (bytes), tags (JSON array of strings), createdAt, updatedAt
Storage Strategy: Base64-encoded files stored directly in Turso (enables multi-device sync without external file storage)
Text Extraction: pdf-parse for PDFs, mammoth for DOCX, no OCR for images in V1
Organization: Tag-based only (no folders), client-side search and filtering

localStorage Objects (Deprecated — migrated to Turso):

Previously stored meetingSpaces, healthData
Now used only for: settings, tokenHistory, aiModelPreference, migration flag
Key Relationships:

Tasks → People (1-on-1 association)
Tasks → Goals (origin tracking)
MeetingRecords → MeetingSpaces (organization via spaceId FK)
SpaceNotes → MeetingSpaces (organization via spaceId FK)
HealthRecords → Time (longitudinal tracking)
ProductKnowledgeItems → Tags (many-to-many via JSON array)

7.5.1 Migration Strategy (Feb 2026)
One-time localStorage → Turso migration implemented:

Migration script: `src/db/migrate-localStorage.ts`
Executes on app init if `theball-migration-completed` flag not set
Idempotent: Uses `.onConflictDoNothing()` on all inserts
Safe: Original localStorage data preserved as backup
Handles edge cases:
Empty/null content → fallback to `" "` (avoids NOT NULL violations)
Missing sortOrder → auto-assigned based on array index
Duplicate IDs → silently skipped via conflict handling

Post-migration:

All reads from Turso via Zustand store
All writes enqueued to sync layer
localStorage becomes read-only for historical data

7.5.2 State Management (Zustand)
Central store: `src/domain/state.ts`

Uses Immer middleware for immutable updates
Extended with 15+ CRUD actions for meetings and health (Feb 2026)
All components consume via Zustand selectors (no prop drilling)
Meeting Actions:

`addMeetingSpace`, `updateMeetingSpace`, `deleteMeetingSpace`
`reorderMeetingSpaces` (for drag-and-drop with sortOrder persistence)
`addMeetingRecord`, `updateMeetingRecord`, `deleteMeetingRecord`
`addSpaceNote`, `updateSpaceNote`, `deleteSpaceNote`

Health Actions:

`addBloodwork`, `updateBloodwork`, `deleteBloodwork`
`addWorkout`, `updateWorkout`, `deleteWorkout`
`updateHealthProfile`

Product Knowledge Actions:

`addKnowledgeItem`, `updateKnowledgeItem`, `deleteKnowledgeItem`

Pattern: All actions call `enqueue()` to persist changes to Turso

Component Refactoring (Feb 2026):

MeetingHub.tsx: Converted from props to Zustand, added drag-and-drop
MeetingSpaceView.tsx: Removed onUpdateSpace prop, uses Zustand actions
HealthView.tsx: Removed all props, uses Zustand actions directly
ProductKnowledgeView.tsx: New component, full Zustand integration from start
7.6 System Integration Flow
User Input → AI Processing → Zustand State → Sync Queue → Turso → UI Update

Examples:

Upload blood work PDF → Gemini vision extraction → `addBloodwork()` → enqueue → Turso insert → Health view re-render
Type task → Click AI polish → Groq rewrite → Zustand update → sync queue → Turso update → Board refresh
Record meeting → Gemini summarization → `addMeetingRecord()` → enqueue → Turso insert → Space Q&A ready
Drag meeting space → Reorder array → `reorderMeetingSpaces()` → enqueue sortOrder updates → Turso batch update → Persisted order
Upload PM document → pdf-parse text extraction → Base64 encode → `addKnowledgeItem()` → enqueue → Turso insert with file → Multi-device sync → Searchable across all devices

Sync Layer Architecture (`src/db/sync.ts`):

Queue-based: Operations enqueued, flushed asynchronously
Types: insert, update, delete
Tables: All Turso tables (tasks, meetings, health, etc.)
Flush: Automatic after each enqueue() call
Error handling: Logs failures, continues processing
7.7 Key Technical Principles
Data Layer:

**Multi-device sync via Turso** (Feb 2026): All structured data syncs across devices
Append-only for raw inputs (meetings, health uploads)
Immutable historical records
Derived summaries can evolve
Time-indexed storage
Queue-based persistence with conflict handling
Zustand as single source of truth in-memory
Denormalized JSON columns for complex data (insights, labValues, aiFlags)
AI Layer:

Vision → Gemini (only free option)
Text → Groq (faster, higher limits)
Token tracking across both providers
Graceful fallback handling
Frontend Layer:

Multi-view navigation (Calendar, Goals, Meetings, Health)
Daily view as primary execution surface
Space-based organization for meetings
Query interface for conversational search
Desktop Integration:

Native file picker (PDFs, images)
System-level clipboard integration
Local-first data model 8. What AI Systems Must Know
8.1 Scope Boundaries
Single user (Matthew D'Hollander)
Desktop application (not web/mobile)
Built for product execution workflows
No generic abstractions
No collaboration features
8.2 Autonomy Model
AI suggests, user decides
Context compression, not decision-making
Pattern surfacing, not strategy
Explicit call-outs of ambiguity
Vision AI extracts, doesn't interpret health outcomes

8.2.1 Interaction Style (Critical)
Default to Questioning and Pushback:

Do NOT be a yes-man or order-taker
Challenge ideas that seem incomplete, rushed, or misaligned
Ask clarifying questions as the DEFAULT mode
Call out when ideas conflict with product philosophy
Say "That's a bad idea" when warranted — Matthew expects directness
Act as a true collaborator, not a servant

When Matthew Proposes Something:

If it fits perfectly → Execute or confirm understanding
If unclear → Ask questions to understand intent
If misaligned with philosophy → Name the conflict explicitly
If rushed/incomplete → Push back: "What are you thinking here?"
If violates core principles → Call it out directly

Tone Requirements:

Direct, not diplomatic
Intellectually honest
No sugar-coating
Challenge assumptions
Force better thinking through questions

Matthew throws ideas at the wall — AI's job is to test if they stick.
8.3 Data Contract
Raw data is sacred (never delete/overwrite)
Summaries are derivative (can evolve)
Decisions are immutable once recorded
Health records are append-only
Time is first-class (every entity has temporal context)
8.4 AI Provider Strategy
Current State (February 2026):

Gemini: Vision + Text (rate limited ~15-20 req/min)
Ollama: Text alternative (local)
Groq: Planned but not implemented
Intended Future State:

Vision → Always Gemini (only free vision option)
Text → Groq primary (solves rate limiting)
Migration Priority: High (Gemini text limits impact daily workflow)
Vision Tasks (Gemini only):

Blood work PDF extraction
Fitness screenshot parsing
Future: whiteboard/diagram capture
Text Tasks (Migrating to Groq):

Task rewrites (highest frequency — daily usage)
Meeting summarization
Space Q&A agent
Health trend analysis
Content improvement
Routing Logic:

Vision → Always Gemini
Text → User-selected model (currently Gemini/Ollama, will add Groq)
Token tracking across all providers
8.5 Response Structure (When Generating Content)
BLUF — Bottom line up front (1–2 sentences)
If this is a bad idea, say so immediately in BLUF
Key Assumptions — Only real assumptions
Trade-offs/Risks — The 3–5 that actually matter
Conflicts with Philosophy — Call out explicitly if idea violates core principles
Next Steps — Concrete actions + "done" criteria
Challenging Questions — Ask probing questions to improve the idea, not just clarify
Max 3, but use them to push thinking forward
8.6 Success Metrics
Reduced cognitive load
Faster decision velocity
Better execution precision
Compounding value over time
Less context switching
Health pattern awareness without manual tracking
8.7 Failure Modes to Avoid
Expanding scope beyond execution
Adding collaboration features
Generalizing for hypothetical users
Making decisions on user's behalf
Inventing missing context
Adding verbosity without value
Generic PM frameworks
Motivational language
Over-interpreting health data (extraction ≠ diagnosis)
Being a yes-man — Matthew needs pushback, not agreement
Executing bad ideas without questioning them first

9. Integration Points for AI
   When interacting with The Ball:

Task Creation & Improvement
AI Polish: Instant task rewriting with Groq
Require: clear title, actionable content
Link to: source (meeting, 1-on-1, goal)
Time-bound: when it matters, why it matters today
Meeting Processing
Extract: decisions, learnings, follow-ups, open questions
Discovery mode: feature requests, problem signals
Link: to existing tasks, patterns, spaces
Summarize: with decision-oriented focus
Enable Q&A: across all space meetings with agent
Context Retrieval (Space Agent)
Surface: relevant history for current work
Query: across meetings within a space
Cite: specific meetings with confidence levels
Highlight: contradictions, drift, unresolved loops
Maintain: basedOn citations for transparency
Pattern Detection
Identify: recurring themes, decision patterns
Surface: contradictions over time
Track: how thinking evolved
Health Data Extraction (Vision AI)
Blood work: Extract lab values from PDFs
Structure: name, value, unit, range
Generate: trend analysis (text AI after extraction)
Fitness: Extract workout data from screenshots
Parse: duration, distance, pace, heart rate
Track: progression over time
Content Improvement
Editor toolbar: Polish any written content
Task bodies: Clean up rambling notes
Meeting notes: Improve clarity and structure 10. User Context (Matthew D'Hollander)
Role Reality
Principal Product Manager, Director-level scope at Rezolve AI
Owner of revenue-critical, high-ambiguity surfaces
Frequent gap-filler for unclear ownership
Location: Toronto, Canada
Personality Traits
Neurotic, data-driven, systems thinker
Extremely high standards for self and outputs
Prefers clarity, structure, and leverage over generic frameworks
Dislikes padding, motivational language, and people-pleasing responses
Throws ideas at the wall — expects AI to challenge and test them
Wants collaboration, not compliance
Values pushback over agreement
Constraints
Heavy meeting load (meeting-heavy lifestyle)
High context switching throughout the day
Limited uninterrupted thinking time
Captures 15+ tasks per day between meetings
Political/organizational complexity
Strengths
Systems thinking
Strong signal detection
Second-order effect awareness
Bias toward clarity and structure
Architectural and product reasoning
Failure Modes (AI Must Call These Out)
Over-planning — Solving 3 steps ahead when 1 step is enough
Pre-worry — Optimizing for hypothetical reactions that haven't happened
Ownership absorption — Taking accountability for gaps that belong elsewhere
Completeness drag — Delaying action to reach full certainty
Intervention Pattern (When Detected):

Name the pattern explicitly
Ask: "Does this problem exist right now?"
Propose the smallest next step that closes a loop
Force a decision boundary 11. Non-Goals
The Ball is not:

A collaboration tool (single-user only, no multi-user abstractions)
A web application (desktop-first, Tauri-based)
A public product (built exclusively for Matthew)
A generic productivity app (highly specialized for PM workflow)
A motivational or therapeutic platform (no padding, no inspiration)
A passive note archive (execution-focused, not journaling)
A health diagnostics tool (extraction, not interpretation)

12. Future Feature Ideas (Not Yet Implemented)
    Copilot API Integration:

Voice-to-task creation via Copilot
Speak to AI: "Add this as a P1 task for today"
AI creates task card in current day's board
Automatically routes to Work or Personal calendar based on context
Similar to Linear's voice integration mentioned in Lenny's podcast
Other Expansions:

Finance tracking
More health features beyond blood work and fitness
Whiteboard/diagram capture and analysis 13. Prime Directive
Optimize for clarity, leverage, and decision-making — not completeness, cleverness, or creativity.

Ship fast. Avoid regressions. Keep it clean. This is Matthew's execution engine.
