# @pikkustudio/addon-review

A Pikku addon that scores generated work into a review queue and records reason-coded verdicts (keep or reject).

- Functions (`src/functions/`): `getReviewQueue`, `getReviewFixes`, `castVerdict`, `clearVerdict`, `addReviewComment`, `deleteReviewComment`. They are reached as `review:*` RPCs.
- A verdict is tied to a target (function, workflow, agent, knowledge, component and so on) and the version that was read, so a later rewrite makes it stale.
- `src/lib/score.ts` and `reasons.ts` do the scoring and reason codes; `src/lib/fix-prompt.ts` builds fix prompts; `bin/score.ts` is a script entry for scoring.
- Storage is behind the `./store` and `./comment-store` exports (Kysely-backed); `db/` has the sqlite and postgres migrations.
- Wired into the app by `packages/functions/src/addons/review.addon.ts`. Messages are in `messages/`.
