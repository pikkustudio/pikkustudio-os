# OS SDK contract

`packages/ui-blocks` (`@pikkustudio/blocks`) does not own an API client. It imports the generated client of whichever workspace composes it.

## What the consumer provides

- `@project/functions-sdk/pikku/api.gen`, exporting `usePikkuQuery` and `usePikkuMutation` typed against the consumer's RPC map. Every one of the 27 files below imports only these two.
- `@/i18n/messages` (`m`), the compiled Paraglide catalog for the consumer's locale, built from `messages/*.json` of this package plus the consumer's own.
- A `SlotsCtx.Provider` when the host adds wording or screens (`src/lib/slots.ts`). Without one every `Copy` entry reads neutral.

Cloud resolves `@project/functions-sdk` to `packages/functions-sdk`; `pikkustudio-os` resolves it to its own `apps/studio` SDK.

## RPCs the blocks call

Studio (provided by `@pikkustudio/addon-studio`): `studio:*` (account, aiOptions, setAi, setProfile, signOut, listProjects, openProject, closeProject, cloneProject, importProject, useLocally, builder*, changes, project*, mock*, listThemes, listVersions, getDesignPreview, restartDesignPreview, attachFile, chooseDirection), `studioActivity`.

Review: `review:*` (getReviewQueue, getReviewFixes, castVerdict, clearVerdict, addReviewComment, deleteReviewComment).

Vault: `vaultSecrets`, `vaultActivity`, `putVaultSecret`, `deleteVaultSecret`.

Content: `contentOverview`, `listContentFolder`, `contentUploadUrl`, `contentDownloadUrl`, `deleteContentFile`, `deleteContentFolder`.

Optional slot `useStageAudit(projectKey, refetchInterval)`: the host supplies the deployed copy's history; without it the feed makes no request and omits that source.

`admin:getAudits` and `console:listStudioChanges` are reached through `useProjectQuery` against the opened project, not the consumer's SDK.

## The 27 importing files

- `packages/ui-blocks/src/blocks/AppNotRunning.tsx`
- `packages/ui-blocks/src/blocks/ContentTree.tsx`
- `packages/ui-blocks/src/blocks/MockBackendPanel.tsx`
- `packages/ui-blocks/src/blocks/MockBackendStatusBar.tsx`
- `packages/ui-blocks/src/blocks/ProjectRunGate.tsx`
- `packages/ui-blocks/src/blocks/TeamProjects.tsx`
- `packages/ui-blocks/src/changes-panel/ChangesPanel.tsx`
- `packages/ui-blocks/src/lib/builder-chat.ts`
- `packages/ui-blocks/src/lib/frontDoors.ts`
- `packages/ui-blocks/src/lib/onboarding.ts`
- `packages/ui-blocks/src/lib/project-flow.ts`
- `packages/ui-blocks/src/lib/project.ts`
- `packages/ui-blocks/src/lib/review.ts`
- `packages/ui-blocks/src/lib/themes.ts`
- `packages/ui-blocks/src/lib/updates.ts`
- `packages/ui-blocks/src/lib/useChooseDirection.ts`
- `packages/ui-blocks/src/lib/versions.ts`
- `packages/ui-blocks/src/screens/ContentScreen.tsx`
- `packages/ui-blocks/src/screens/DesignScreen.tsx`
- `packages/ui-blocks/src/screens/LogsScreen.tsx`
- `packages/ui-blocks/src/screens/MetricsScreen.tsx`
- `packages/ui-blocks/src/screens/NewProjectRoute.tsx`
- `packages/ui-blocks/src/screens/OnboardingLayout.tsx`
- `packages/ui-blocks/src/screens/PerformanceScreen.tsx`
- `packages/ui-blocks/src/screens/ProjectHomeGate.tsx`
- `packages/ui-blocks/src/screens/ResumeScreen.tsx`
- `packages/ui-blocks/src/screens/SecretsScreen.tsx`
