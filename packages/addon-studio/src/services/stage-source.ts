import type { SourceContext } from './log-source.js'

// What a host that publishes projects can say about a published copy, beyond its logs and metrics: its releases,
// its secrets and settings, and how often its analytics events fired. Each is contributed by that host (none in the
// open build). A `stage` of null means the project's production copy.

/** A project as a host's stage sources are asked about it. */
export type StageContext = Omit<SourceContext, 'target'>

export type StageReleaseStatus = 'live' | 'was-live' | 'rolled-back' | 'failed' | 'cancelled' | 'working' | 'waiting'
export type StageReleaseWait = 'approval' | 'config' | 'attention' | 'builder'
export type StageReleaseFailedAt = 'build' | 'tests' | 'start' | 'publish' | 'data'
export type StageReleaseGroup = {
  id: 'functions' | 'routes' | 'jobs' | 'migrations' | 'secrets' | 'variables' | 'parts'
  items: { change: 'added' | 'changed' | 'removed'; name: string }[]
}
export type StageReleaseMissing = { name: string; kind: 'secret' | 'variable'; description: string | null }

export interface StageRelease {
  id: string
  version: string
  title: string | null
  by: string | null
  at: number
  liveAt: number | null
  status: StageReleaseStatus
  wait: StageReleaseWait | null
  failedAt: StageReleaseFailedAt | null
  reason: string | null
  progress: string | null
  step: number
  groups: StageReleaseGroup[]
  missing: StageReleaseMissing[]
}

export interface StageReleaseList {
  /** Which copy the releases are of; Studio names the production one itself. */
  place: { production: boolean; name: string }
  url: string | null
  releases: StageRelease[]
  /** Saved work the copy has not published yet. */
  pending: { id: string; title: string; by: string | null; at: number }[]
  autoUpdate: boolean
  canGoBack: boolean
  /** Whether a release is still on its way, so Studio asks again soon. */
  moving: boolean
}

/** Why a release is flagged; Studio words each reason. `security` carries the advisory's own title in `text`. */
export type StageReleaseFlagReason =
  | 'tests-failed'
  | 'function-removed'
  | 'function-version-removed'
  | 'unit-removed'
  | 'route-removed'
  | 'handler-removed'
  | 'workflow-removed'
  | 'webhook-removed'
  | 'migration-destructive'
  | 'security'

export type StageReleaseFlag = { id: string; level: 'security' | 'breaking' | 'tests'; name: string; reason: StageReleaseFlagReason; text?: string; count?: number }

export interface StageReleaseDetail {
  flags: StageReleaseFlag[]
  tests: { passed: number; failed: number; skipped: number } | null
  log: string | null
}

export type StageReleaseAction =
  | { action: 'approve' | 'dismiss' | 'recheck' | 'goBack' | 'tryAgain'; id: string }
  | { action: 'fill'; kind: 'secret' | 'variable'; name: string; value: string }
  | { action: 'autoUpdate'; on: boolean }

/** A published copy's releases, and what can be done to them. Each read answers null where there is no such copy. */
export interface StageReleases {
  list(ctx: StageContext, stage: string | null): Promise<StageReleaseList | null>
  detail(ctx: StageContext, stage: string | null, id: string): Promise<StageReleaseDetail | null>
  /** What the next publish would change against what is live; null when unknown. */
  preview(ctx: StageContext, stage: string | null): Promise<StageReleaseGroup[] | null>
  /** `allClear` answers a recheck: whether the release now has everything it needs. */
  act(ctx: StageContext, stage: string | null, action: StageReleaseAction): Promise<{ allClear: boolean }>
}

export type StageAnalyticsCount = { name: string; total: number; signedIn: number; series: { day: string; count: number }[] }

/** How often each analytics event fired on a published copy; null when that copy is not published. */
export interface StageAnalytics {
  counts(ctx: StageContext, stage: string, days: number): Promise<StageAnalyticsCount[] | null>
}

export type StageSettingValues = { secretIds: string[]; settings: Record<string, { exists: boolean; value: string | null }> }

/** A published copy's secrets and settings. Secrets are written, never read back. */
export interface StageSettingsStore {
  read(ctx: StageContext, stage: string, settingIds: string[]): Promise<StageSettingValues | null>
  saveSecret(ctx: StageContext, stage: string, name: string, value: string): Promise<void>
  saveSetting(ctx: StageContext, stage: string, settingId: string, value: string): Promise<void>
}
