# Step 5: Code Review Stage

> **Usage:** After completing implementation (Step 4), I (GitHub Copilot) perform a systematic self-review before moving to testing/deployment.

## My Task

I review my own implementation for quality, security, performance, and architectural compliance using this structured checklist.

## Why Self-Review Matters

Even though I implemented the code, systematic review catches:

- Oversights made during rapid implementation
- Consistency issues across files
- Unintended side effects or regressions
- Missing error handling or edge cases
- Deviations from The Ball's architectural patterns

## Review Checklist

### Logging

- [ ] No `console.log` statements in production code
- [ ] Uses proper logger with context (`src/domain/ai/logger.ts`)
- [ ] Error logs include helpful context (user action, state, inputs)
- [ ] AI operations logged with token tracking

### Error Handling

- [ ] Try-catch blocks around all async operations
- [ ] Centralized error handlers used where appropriate
- [ ] Error messages are helpful and user-friendly
- [ ] Failed AI calls have graceful fallbacks (Gemini → Ollama)
- [ ] Database errors handled with rollback strategy

### TypeScript

- [ ] No `any` types (use proper interfaces or `unknown`)
- [ ] Proper type definitions for all functions/components
- [ ] No `@ts-ignore` or `@ts-expect-error` without comments
- [ ] Interfaces defined in `src/domain/types.ts` if shared
- [ ] Schema types match Drizzle definitions

### Production Readiness

- [ ] No debug statements or console logs
- [ ] No TODO comments without issue tracking
- [ ] No hardcoded secrets, API keys, or credentials
- [ ] No commented-out code blocks
- [ ] Environment-specific configs properly handled

### React/Hooks

- [ ] `useEffect` hooks have cleanup functions where needed
- [ ] Dependencies arrays are complete and correct
- [ ] No infinite render loops (verify deps carefully)
- [ ] Hooks follow Rules of Hooks (not in conditionals/loops)
- [ ] Event handlers properly bound or use arrow functions

### Performance

- [ ] No unnecessary component re-renders
- [ ] Expensive calculations wrapped in `useMemo`
- [ ] Event handlers wrapped in `useCallback` when passed as props
- [ ] Large lists use virtualization if needed
- [ ] AI operations respect rate limits (Gemini 15-20 req/min)

### Security

- [ ] User inputs validated before processing
- [ ] File uploads validated (type, size)
- [ ] No SQL injection risks (Drizzle protects, but verify)
- [ ] No XSS vulnerabilities in rendered content
- [ ] Sensitive data not logged or exposed

### Architecture

- [ ] Follows existing patterns in similar components
- [ ] Code in correct directory (`components/`, `domain/`, `db/`)
- [ ] State management uses Zustand (`src/domain/state.ts`)
- [ ] Database operations use Drizzle ORM
- [ ] Work vs Personal category handled properly (if task-related)
- [ ] Single-user philosophy maintained (no multi-user abstractions)
- [ ] localStorage vs Turso decision is correct for data type

### The Ball Specific

- [ ] **Work vs Personal split:** Tasks properly categorized
- [ ] **Voice capture:** Web Speech API integration intact
- [ ] **AI rate limits:** Gemini calls tracked, fallback to Ollama
- [ ] **Migrations:** Drizzle migrations generated and tested
- [ ] **Data preservation:** Existing user data migrated correctly
- [ ] **Core execution loop:** Task management (80% of app) unaffected

## Output Format

Provide review results in this structure:

### ✅ Looks Good

- Architecture follows existing patterns
- Error handling comprehensive
- TypeScript types properly defined
- [Additional positive findings]

### ⚠️ Issues Found

- **CRITICAL** [File:line] - Security vulnerability in X
  - Fix: [Specific suggested fix]
- **HIGH** [File:line] - Performance issue with Y
  - Fix: [Specific suggested fix]
- **MEDIUM** [File:line] - Code quality issue Z
  - Fix: [Specific suggested fix]

- **LOW** [File:line] - Minor improvement needed
  - Fix: [Specific suggested fix]

### 📊 Summary

- Files reviewed: X
- Critical issues: X
- High priority: X
- Medium priority: X
- Low priority: X

## Severity Levels

- **CRITICAL** - Security vulnerabilities, data loss risks, crashes, corruption
- **HIGH** - Bugs that affect core functionality, performance issues, bad UX
- **MEDIUM** - Code quality issues, maintainability concerns, minor bugs
- **LOW** - Style inconsistencies, minor improvements, optimizations

## After Review

1. **If CRITICAL issues found:** I stop and fix immediately before proceeding
2. **If HIGH issues found:** I prioritize fixes before testing
3. **If only MEDIUM/LOW:** I document and optionally fix before testing
4. **Update plan in conversation:** Mark review step 🟩 and note any findings

---

**After review is complete and issues resolved:**

- I summarize what was implemented and areas to test
- Matthew proceeds to Step 6: Manual Testing (outside this conversation)
- I wait for test results before Step 7: Deployment
