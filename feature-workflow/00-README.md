# Feature Development Workflow

## What This Is

A structured process for developing complex features in The Ball, based on Lenny's podcast methodology for non-technical PMs working with AI coding assistants.

Use this workflow when building features that:

- Touch multiple modules (tasks + meetings + health)
- Require schema/database changes
- Add new AI integration patterns
- Could cause regressions in core execution loop

**Skip this for:** Bug fixes, UI tweaks, minor feature additions

---

## How It Works

### The Setup

You use **one continuous conversation** with GitHub Copilot (me) where:

1. I act as your CTO using the prompts in this folder as my instructions
2. Context persists throughout (no copy/paste between tools)
3. I can read/write files directly in your workspace
4. I reference ProjectContext.md for deep system knowledge

### The 7-Step Process

**Step 1: Brainstorm & Clarify** (01-cto.md)

- Tell me the feature or bug
- I ask clarifying questions until clear
- I challenge ideas that seem misaligned or incomplete

**Step 2: Explorer (Discovery)** (02-explorer.md)

- I explore the codebase using semantic search, file reads, grep
- I identify affected files, schema changes, integration points, risks
- I document findings and ask clarifying questions

**Step 3: Plan Creation** (03-plan.md)

- I create implementation plan from clarification + exploration
- Clear steps with status tracking (🟩🟨🟥)
- Critical decisions, rollback strategy
- **STOP: I wait for your explicit approval before Step 4**

**Step 4: Implementation** (04-implementation.md)

- I implement precisely as planned
- I update plan document with progress (🟩🟨🟥)
- I follow existing patterns, write minimal code
- I handle schema migrations, multi-file changes, all in this conversation

**Step 5: Code Review** (05-review.md)

- I review my own implementation for quality, security, architecture
- I check: logging, errors, TypeScript, performance, production readiness
- I verify: React/Hooks correctness, Work vs Personal handling
- I categorize any issues by severity and fix before proceeding

**Step 6: Testing** (Manual)

- You manually test the feature in Work and Personal calendars
- You verify no regressions in core execution loop
- You check edge cases and data migration

**Step 7: Deployment**

- I suggest git commit message based on changes
- **STOP: I wait for your approval of commit message**
- You approve → I execute git commit and push
- Feature is shipped

---

## Approval Gates

**There are TWO explicit approval gates in this workflow:**

**Gate 1 - After Step 3 (Plan):**

- I present the implementation plan
- I ask: "Does this plan look good? Any changes needed?"
- **I WAIT for your explicit approval:** "approved", "looks good", "proceed", etc.
- Without approval, I do NOT proceed to Step 4

**Gate 2 - After Step 6 (Testing):**

- You manually test the feature
- If bugs found: You report, I fix, we re-test
- If tests pass: You say "tests pass" or "looks good"
- I suggest git commit message
- **I WAIT for your approval:** "approved", "yes", "commit it", etc.
- Without approval, I do NOT execute git commands

---

## When Things Don't Go As Planned

**During Step 1 (Clarification):**

- If I think it's a bad idea, I'll say so explicitly with reasoning
- We discuss alternatives or you decide to proceed anyway

**During Step 2 (Discovery):**

- If I find critical risks or blockers, I may recommend NOT proceeding
- I explain risks clearly, we discuss whether to continue

**During Step 4 (Implementation):**

- If I hit blocking issues, I stop and ask for guidance (not make assumptions)
- We adjust plan or approach together

**During Step 6 (Testing):**

- If bugs found, we iterate back to Step 4
- I fix issues and we re-test until clean

**Context Getting Too Long:**

- If conversation grows large (risk of context truncation), I'll warn you
- I'll summarize critical decisions and reference them throughout
- Consider starting fresh conversation with summary as context if needed

---

## Files You'll Use

### Always Active (Auto-injected)

- **`.github/copilot-instructions.md`** - Auto-loaded into every Copilot conversation
  - Quick reference: tech stack, product priorities, your personality
  - Points to ProjectContext.md for deep dives
  - High-signal, compressed version

### Deep Reference (On-demand)

- **`ProjectContext.md`** - Complete system bible (496 lines)
  - Full architecture, data philosophy, AI patterns
  - Component relationships, integration flows
  - Referenced when I need architectural details
  - You generally don't touch this directly

### This Workflow Folder

- **`00-README.md`** (this file) - How to use the workflow
- **`01-cto.md`** - CTO role, clarification, pushback philosophy
- **`02-explorer.md`** - Discovery stage checklist
- **`03-plan.md`** - Implementation plan with status tracking
- **`04-implementation.md`** - Code execution stage
- **`05-review.md`** - Code review checklist
- **`06-testing.md`** - Manual testing (Matthew does this)
- **`07-deployment.md`** - Git commit workflow with approval gate

---

## When To Invoke What

### Starting a Complex Feature

1. In any Copilot conversation (new or existing), say: **"I want to run the CTO workflow for [feature name]"**
2. I'll read `01-cto.md` and start asking clarifying questions
3. Context persists throughout all steps in this one continuous conversation
4. I handle discovery, planning, implementation, and review all in this single conversation

### If I Need Deep Context

- I'll automatically reference `ProjectContext.md` when making architectural decisions
- You don't need to tell me to read it (it's in copilot-instructions)

### If Something Changes

- Update `ProjectContext.md` with new architectural patterns, tech decisions, or product direction
- Update `.github/copilot-instructions.md` if the high-level summary needs adjustment
- This workflow folder files are my instructions, not yours - only update if the process changes

---

## Quick Start Example

```
You: "I want to run the CTO workflow - add recurring tasks feature"

Me: [reads 01-cto.md, references ProjectContext.md]
     "Got it. Clarifying questions:
     1. How do users define recurrence? (daily/weekly/monthly?)
     2. Does this affect Work and Personal calendars separately?
     3. What happens to completed recurring tasks - archive or keep visible?"

[You answer]

Me: [explores codebase, identifies affected files]
     "Discovery complete. Found: TaskCard.tsx needs recurring badge,
     schema needs recurrencePattern field, Board.tsx spawns new instances..."

Me: [creates implementation plan with steps]
     "Here's the plan: [details]

     Does this plan look good? Any changes needed?"

You: "Approved, proceed"

Me: [implements Step 1] ✅ Schema updated
     [implements Step 2] ✅ UI components updated
     ...
     [reviews implementation]

     "Implementation and review complete. Ready for you to test manually."

[You test outside conversation]

You: "Tests pass, looks good"

Me: "Great! I suggest committing with:
     'feat: add recurring tasks with daily/weekly/monthly options'

     Ready to commit and push?"

You: "Approved"

Me: [executes git commit and push]
     "✅ Committed and pushed to main. Feature shipped!"
```

---

## Context Hierarchy

```
.github/copilot-instructions.md  (Auto-injected, always active)
         ↓
    References
         ↓
ProjectContext.md  (Deep dive when needed)
         ↓
    Informs
         ↓
feature-workflow/  (Process instructions for complex work)
```

**Implemented:**

- ✅ 01-cto.md (CTO role, clarification, pushback philosophy)
- ✅ 02-explorer.md (Discovery stage, architecture patterns)
- ✅ 03-plan.md (Implementation plan with approval gate)
- ✅ 04-implementation.md (Code execution, progress tracking)
- ✅ 05-review.md (Code review checklist, quality gates)
- ✅ 06-testing.md (Manual testing by Matthew)
- ✅ 07-deployment.md (Git workflow with approval gate)
- ✅ ProjectContext.md (canonical source of truth, 496 lines)
- ✅ .github/copilot-instructions.md (auto-injection working)

**Complete.** Ready to use for complex feature development.
