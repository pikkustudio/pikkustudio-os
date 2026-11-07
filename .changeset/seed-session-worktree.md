---
'@pikkustudio/addon-studio': patch
---

New session worktrees start with installed dependencies and build output through worktrunk and the project's `.worktreeinclude`: cloned where the disk supports copy-on-write, and on other filesystems (ext4) with build output copied and `node_modules` from a hard-linked frozen install instead of a full copy. A hung `wt` or install is killed with everything it forked, a failure logs the tool's stderr, and git older than 2.43 is reported instead of run. New projects get a `.worktreeinclude`; `.env` is never copied.
