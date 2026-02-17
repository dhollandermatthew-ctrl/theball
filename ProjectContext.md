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
3.1 Daily Execution Control (Primary)
The system used to:

Track daily tasks (calendar view)
Manage 1-on-1 conversations and follow-ups
Track goals with progress visibility
Prioritize what matters today
Execute with full context
Principles:

Tasks are time-aware
Tasks are context-rich
Tasks can be instantly improved with AI
Execution requires no tool switching
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

3.3 Health Tracking & Longitudinal Awareness (Primary)
Health data is first-class, not an afterthought.

Tracks:

Blood work results (extracted from lab PDFs via AI vision)
Fitness records (extracted from workout screenshots via AI vision)
Trends over time with AI-generated insights
Why it exists:

Health affects execution capacity
Patterns emerge slowly (need longitudinal view)
Manual data entry is a blocker (AI extraction solves this)
Principles:

Upload → Extract → Analyze (automated pipeline)
AI handles vision parsing, user handles decisions
Historical data preserved for trend analysis

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
Component Architecture:

Task management (Board, Column, TaskCard)
Goals tracking (GoalView, GoalCard, GoalTimeline)
Meeting spaces (MeetingHub, MeetingSpaceView, SpaceChatPanel)
Health tracking (HealthView with AI extraction)
WYSIWYG editor with AI polish toolbar
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
15 requests/minute free tier
Used for vision tasks + text overflow
Groq (text-only, high-speed)
Generous free tier limits
Primary text provider (faster than Gemini)
Model Provider Pattern:

Global state management for AI selection
User-controlled dropdown (Gemini | Groq)
Automatic routing based on task type
Token tracking (24-hour rolling window)
AI Usage Patterns by Type:

Vision (Gemini only):

Blood work extraction from PDFs
Fitness data from workout screenshots
Future: whiteboard/diagram capture

Text (Groq primary, Gemini fallback):

Task rewrites (constant usage)
Meeting summarization
Space Q&A agent
Health analysis generation
Content polish toolbar

7.5 Data Schema (Key Entities)
Core Tables (Turso):

tasks: Execution units with time/priority/status
calendar tasks (date-based)
1-on-1 tasks (conversation-linked)

goals: Progress tracking with timeline
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
8.3 Data Contract
Raw data is sacred (never delete/overwrite)
Summaries are derivative (can evolve)
Decisions are immutable once recorded
Health records are append-only
Time is first-class (every entity has temporal context)
8.4 AI Provider Strategy
Vision Tasks (Gemini only):

Blood work PDF extraction
Fitness screenshot parsing
Future: whiteboard/diagram capture
Text Tasks (Groq primary, Gemini fallback):

Task rewrites (highest frequency)
Meeting summarization
Space Q&A agent
Health trend analysis
Content improvement
Routing Logic:

Vision → Always Gemini
Text → User-selected model (Groq recommended)
Token tracking across both providers
8.5 Response Structure (When Generating Content)
BLUF — Bottom line up front (1–2 sentences)
Key Assumptions — Only real assumptions
Trade-offs/Risks — The 3–5 that actually matter
Next Steps — Concrete actions + "done" criteria
Clarifying Questions — Max 3, only if materially impactful
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
Principal Product Manager, Director-level scope
Owner of revenue-critical, high-ambiguity surfaces
Frequent gap-filler for unclear ownership
Constraints
Heavy meeting load
High context switching
Limited uninterrupted thinking time
Political/organizational complexity
Strengths
Systems thinking
Strong signal detection
Second-order effect awareness
Bias toward clarity and structure
Failure Modes (Call Out)
Over-planning
Pre-worrying about hypothetical futures
Waiting for full certainty
Absorbing ownership that belongs elsewhere
When these appear, AI should:

Name the pattern explicitly
Force a decision boundary
Propose smallest next step that closes a loop 11. Non-Goals
The Ball is not:

A collaboration tool
A web application
A public product
A generic productivity app
A motivational or therapeutic platform
A passive note archive
A health diagnostics tool 12. Prime Directive
Optimize for clarity, leverage, and decision-making — not completeness, cleverness, or creativity.
