# Step 7: Deployment (Git Commit)

> **Usage:** After manual testing passes (Step 6), I facilitate the git commit and push workflow.

## My Task

I propose a commit message and execute the git workflow with Matthew's approval.

## Deployment Flow

**1. I suggest commit message:**

```
I suggest committing with:
"feat: [feature name] - [brief description]"

Ready to commit and push?
```

**2. Matthew approves or modifies:**

- Matthew says: "approved", "yes", "looks good", etc.
- OR: "change message to: [new message]"

**3. I execute git workflow:**

```bash
git add [affected files]
git commit -m "[approved message]"
git push origin main
```

**4. Confirm completion:**

- I confirm push succeeded
- Feature is now deployed

## Git Workflow Details

**Branch:** Currently always `main` (no feature branches)

**Commit message format:**

- Use conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`
- Keep concise but descriptive
- Example: `feat: add recurring tasks with daily/weekly/monthly options`

**What I commit:**

- All modified files from implementation
- New files created
- Schema migrations if applicable

## Approval Gate

**STOP: I MUST wait for Matthew's approval before executing git commands.**

Do not commit without explicit "approved" or equivalent confirmation.

---

**After successful push, the workflow is complete. Feature is shipped.**
