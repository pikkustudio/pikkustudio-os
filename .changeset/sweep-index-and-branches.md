---
'@pikkustudio/addon-studio': patch
---

The session sweep no longer refreshes a worktree's index (all its git calls are read-only), so a dry run and the run after it agree. After removing a session it deletes the `s-xxxx` branch with `git branch -d` when merged into develop, the sweep clears orphaned merged `s-xxxx` branches (reported under `branches`), and `createSession` skips names that already exist as branches. Unmerged branches are never deleted.
