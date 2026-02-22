# Step 4: Implementation Stage

> **Usage:** After plan is reviewed and approved (Step 3), I (GitHub Copilot) implement the feature following this guidance.

## My Task

**Implement precisely as planned, in full.**

## Implementation Requirements

**Code Quality:**

- Write elegant, minimal, modular code
- Adhere strictly to existing code patterns, conventions, and best practices
- Follow The Ball's architecture (see ProjectContext.md)
- Include thorough, clear comments/documentation within the code

**Pattern Adherence:**

- **React components:** Functional components with TypeScript
- **State management:** Zustand (`src/domain/state.ts`) following existing patterns
- **Database:** Drizzle ORM for Turso schema (`src/db/schema.ts`)
- **Styling:** Tailwind CSS classes, follow existing component styling
- **AI integration:** Use `modelProvider` for routing, track tokens
- **File organization:** Follow existing `src/` structure

**Critical Constraints:**

- **Work vs Personal:** If touching tasks, handle `category: "work" | "personal"` properly
- **Single-user:** No multi-user abstractions, no collaboration features
- **Migrations:** Schema changes require Drizzle migrations (`drizzle-kit generate`)
- **localStorage:** Structure changes need migration logic for existing data
- **No regressions:** Task management (80% of app) must remain stable

**Progress Tracking:**

As I implement each step:

- I update the markdown plan document with emoji status (🟩🟨🟥)
- I update overall progress percentage dynamically
- I mark subtasks as completed incrementally
- I communicate progress clearly to Matthew

**Testing Checklist (Before marking done):**

- [ ] Feature works in Work calendar
- [ ] Feature works in Personal calendar
- [ ] Existing tasks/data unaffected
- [ ] No console errors
- [ ] Voice capture still works (if task-related)
- [ ] AI integrations respect rate limits (if applicable)

## Implementation Capabilities

I can handle all implementation tasks in this conversation:

- Read/write files across the entire codebase
- Run terminal commands (npm install, drizzle-kit, git, etc.)
- Create new files and directories
- Edit multiple files simultaneously
- Execute and verify code changes
- Run tests and check for errors

---

## Implementation Flow

1. **Start with schema/state changes** (if applicable)
   - Update `src/db/schema.ts`
   - Run `drizzle-kit generate` for migration
   - Update `src/domain/state.ts`
   - Add migration logic if needed

2. **Implement core logic**
   - Create/modify domain logic files
   - Update types (`src/domain/types.ts`)
   - Add utilities if needed

3. **Build UI components**
   - Create new components or modify existing
   - Follow Tailwind patterns
   - Add proper TypeScript types

4. **Wire up integration**
   - Connect components to state
   - Add event handlers
   - Test data flow

5. **Update plan in conversation**
   - Mark completed steps 🟩
   - Update progress percentage
   - Note any deviations or issues

6. **Validate basic functionality**
   - Check for console errors
   - Verify code compiles/runs
   - Ensure no obvious breaks

---

**After implementation is complete, I proceed to Step 5: Code Review**
