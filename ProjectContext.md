The Ball — Complete AI Context Document
Version: 2.0
Status: Canonical (Updated February 2026)
Owner: Matthew D'Hollander
Purpose: Full grounding context for AI systems interacting with The Ball project

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
WYSIWYG editor (WysiwygEditor) with AI polish toolbar (EditorToolbar)
Cross-app search (SearchModal)
Goals tracking (GoalView, GoalCard, GoalTimeline) — being sunset
7.3 Data Layer
Primary Storage:

Turso (SQLite) for structured data:
Tasks (calendar + 1-on-1)
Goals
People (1-on-1 tracking)
localStorage for unstructured data:
Meeting spaces & records
Health data (blood work, fitness)
App settings
Token usage history
Data Sync:

Drizzle ORM for schema management
Client-side only (no server)
Immediate persistence model
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

tasks: Execution units with time/priority/status
CRITICAL: Every task has `category: "work" | "personal"` field
This split is architectural - affects all task features
calendar tasks (date-based)
1-on-1 tasks (conversation-linked)

goals: Progress tracking with timeline (being sunset)
people: 1-on-1 conversation partners
localStorage Objects:

meetingSpaces: Organization containers

records: Meeting transcripts + insights
spaceNotes: Persistent notes within spaces

healthData:

bloodWorkRecords: Lab results + AI analysis
workoutRecords: Fitness data + metadata

settings: UI preferences, zoom, sidebar state
tokenHistory: AI usage tracking
Key Relationships:

Tasks → People (1-on-1 association)
Tasks → Goals (origin tracking)
MeetingRecords → MeetingSpaces (organization)
MeetingInsights → MeetingRecords (derived summaries)
HealthRecords → Time (longitudinal tracking)
7.6 System Integration Flow
User Input → AI Processing → Data Storage → UI Update

Examples:

Upload blood work PDF → Gemini vision extraction → localStorage → Health view trends
Type task → Click AI polish → Groq rewrite → Turso update → Board refresh
Record meeting → Gemini summarization → localStorage → Space Q&A ready
7.7 Key Technical Principles
Data Layer:

Append-only for raw inputs (meetings, health uploads)
Immutable historical records
Derived summaries can evolve
Time-indexed storage
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
