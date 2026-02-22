# Step 3: Plan Creation Stage

> **Usage:** After completing discovery in Step 2, I (GitHub Copilot) use this template to create an implementation plan.

## My Task

Based on clarification (Step 1) and discovery (Step 2), I create an implementation plan **in this conversation**.

## Requirements for the Plan

- **Clear, minimal, concise steps** - No extra complexity
- **Track status with emojis:**
  - 🟩 Done
  - 🟨 In Progress
  - 🟥 To Do
- **Dynamic progress percentage** at top (calculate from completed tasks)
- **Do NOT add extra scope** beyond explicitly clarified details
- **Steps should be modular, elegant, minimal** and integrate seamlessly with existing codebase
- **Call out Work vs Personal impact** if feature touches tasks
- **Flag migration requirements** if schema changes needed
- **Note AI integration** if feature uses Gemini/Ollama (consider rate limits)

## Plan Structure

I'll present the plan directly in conversation using this format:

    # Feature Implementation Plan: [Feature Name]

    **Overall Progress:** 0%

    ## TLDR

    Short summary of what we're building and why.

    ## Critical Decisions

    Key architectural/implementation choices made during exploration:

    - **Decision 1:** [choice] - [brief rationale]
    - **Decision 2:** [choice] - [brief rationale]
    - **Work vs Personal:** [Does this affect both calendars? Different behavior?]
    - **Data Layer:** [Turso schema changes? localStorage changes? Migrations needed?]
    - **AI Integration:** [Using Gemini/Ollama? Rate limit considerations?]

    ## Tasks

    - [ ] 🟥 **Step 1: [Name]**
      - [ ] 🟥 Subtask 1
      - [ ] 🟥 Subtask 2

    - [ ] 🟥 **Step 2: [Name]**
      - [ ] 🟥 Subtask 1
      - [ ] 🟥 Subtask 2

    - [ ] 🟥 **Step 3: Schema/State Changes** (if applicable)
      - [ ] 🟥 Update Drizzle schema (src/db/schema.ts)
      - [ ] 🟥 Generate migration (drizzle-kit generate)
      - [ ] 🟥 Update Zustand store (src/domain/state.ts)
      - [ ] 🟥 Migration logic for existing data

    - [ ] 🟥 **Step 4: Component Implementation**
      - [ ] 🟥 [Component 1 changes]
      - [ ] 🟥 [Component 2 changes]

    - [ ] 🟥 **Step 5: Testing & Validation**
      - [ ] 🟥 Test Work calendar behavior
      - [ ] 🟥 Test Personal calendar behavior
      - [ ] 🟥 Test existing data migration
      - [ ] 🟥 Verify no regressions in core execution loop

    ## Rollback Strategy

    [How to undo if this breaks production]

    ## Open Questions (if any)

    - Question 1
    - Question 2

## Approval Gate

**After presenting the plan, I MUST:**

1. Ask "Does this plan look good? Any changes needed?"
2. Wait for Matthew's explicit approval: "approved", "looks good", "proceed", etc.
3. If changes requested, revise plan and ask for approval again
4. Do NOT proceed to Step 4 (Implementation) without approval

## Remember

- **This is a planning artifact only** - implementation happens in Step 4
- No extra complexity or extra scope beyond what was discussed in clarification + exploration
- The plan stays in this conversation (no separate file)
- Plan becomes the source of truth I reference during implementation

```

```
