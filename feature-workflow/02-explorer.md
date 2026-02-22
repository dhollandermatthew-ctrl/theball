# Step 2: Explorer (Discovery Stage)

> **Usage:** After clarifying requirements in Step 1, I (GitHub Copilot) use this checklist to systematically explore the codebase before creating an implementation plan.

## My Task

My task is **NOT to implement yet**, but to fully understand the codebase and prepare for implementation.

## My Responsibilities

- **Analyze the existing codebase thoroughly** - Understand current patterns
- **Determine integration points** - How does this feature fit with existing modules?
- **Identify dependencies** - What files, functions, schemas, state will be affected?
- **Map data flow** - Where does data enter, transform, persist, display?
- **Consider edge cases** - Focus on data migration, existing user workflows, and failure states
- **Flag constraints** - Work vs Personal split, single-user architecture, AI rate limits, etc.
- **List ambiguities** - Anything unclear in the feature description or current implementation

## Tools I'll Use

- **semantic_search** - Find relevant code patterns, similar features
- **grep_search** - Search for specific keywords, imports, function calls
- **read_file** - Read component files, schema definitions, state management
- **list_dir** - Understand folder structure and file organization
- **get_errors** - Check for existing issues in affected areas

## Critical Architecture Patterns to Consider

**Work vs Personal Calendar Split (CRITICAL):**

- Every task has `category: "work" | "personal"` field
- Does this feature affect both calendars or just one?
- Does behavior differ between Work and Personal contexts?
- If adding task fields, do both calendars display them the same way?
- Does voice capture flow change? (Web Speech API → new fields?)

**Data Storage:**

- Turso (SQLite) via Drizzle ORM for structured data: tasks, people, oneOnOnes
  - Schema changes require Drizzle migrations (`drizzle-kit generate`, `drizzle-kit push`)
  - Migration strategy: How to handle existing data?
- localStorage for unstructured: meetings, health data, settings
  - Structure changes need migration logic for existing localStorage data
- Which layer does this feature touch?

**AI Integration:**

- Gemini (vision + text, 15-20 req/min limit - runs out ~1 in 10 days)
- Ollama (local text alternative)
- Groq (planned but not implemented)
- Does this feature use AI? Consider rate limits.

**Single-User Philosophy:**

- No multi-user abstractions
- No collaboration features
- No sharing/permissions logic

**Core Execution Loop (80% of app):**

- Task management is primary - will this impact daily workflow?
- Meeting intelligence and health are secondary
- Risk of regressions in task management is HIGH priority

## What I'll Document

After exploring, I'll summarize my findings:

1. **Files that need modification** (with line numbers if possible)
2. **New files that need creation**
3. **Schema changes required**
   - Turso tables (Drizzle schema in `src/db/schema.ts`)
   - localStorage structures
   - Migration strategy for existing data
4. **State changes** (Zustand store in `src/domain/state.ts`)
5. **Component changes** (UI updates, new components)
6. **Voice capture impact** - Does Web Speech API flow change?
7. **Dependencies/risks** - What could break? What's coupled?
8. **Rollback strategy** - How to undo if this breaks production?
9. **Questions/ambiguities** - What needs clarification from Matthew?

## Discovery Process

1. I search the codebase for relevant patterns and similar features
2. I read affected files to understand current implementation
3. I identify all integration points and dependencies
4. I document findings and ask clarifying questions
5. **If I discover critical risks or blockers:** I may recommend NOT proceeding
6. Once all ambiguities are resolved, I proceed to Step 3 (Planning)

## When I Might Recommend Not Proceeding

- Implementation would break core execution loop (task management)
- Conflicts fundamentally with single-user architecture
- Requires refactoring too much existing code (risk > benefit)
- Technical debt or complexity outweighs feature value
- Critical unknowns that can't be resolved without extensive research

**If this happens:** I explain reasoning clearly and we discuss alternatives.

---

**After completing discovery, I move to Step 3: Create the implementation plan.**
