---
'@pikkustudio/addon-studio': patch
---

New session worktrees start with installed dependencies and build output, cloned from develop through worktrunk using the project's `.worktreeinclude`; new projects get one, and `.env` is never copied.
