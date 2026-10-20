import type { SourceKind, TargetRef } from './log-source.js'
import type { StageContext, StageReleaseStatus, StageReleases } from './stage-source.js'

// What the shell's rail shows besides nav: who is signed in and the teams they are in, where a project's screens
// read from, how its last publish went and how many notifications wait. Studio answers each one locally; a host
// that holds accounts, published copies or notifications contributes a source (none in the open build).

export type ShellUser = { name: string | null; email: string | null }

export type ShellTeam = { slug: string; name: string; personal: boolean; memberCount: number; projectCount: number }

export type ShellLink = { id: string; path: string }

/** The signed-in viewer as an account host knows them. `scopes` are the viewer's in the current team; left out, Studio's own answer stands. */
export type ShellViewer = { user: ShellUser | null; teams: ShellTeam[]; currentTeam: string | null; links: ShellLink[]; scopes?: string[] }

export interface AccountSource {
  /** `team` is the team the URL names, when it names one. */
  viewer(ctx: { team?: string; session?: unknown }): Promise<ShellViewer>
}

/** One place a project's screens can read from. A workspace runs the code; a stage is a published copy and only views. */
export type TargetOption = {
  kind: TargetRef['kind']
  name: string
  label: string | null
  live: boolean
  production: boolean
  isDefault: boolean
  branch: string | null
  forChanges: boolean
}

export interface TargetSource {
  list(ctx: StageContext): Promise<TargetOption[]>
  /** Calls a function of the project at that target; only kinds that run somewhere else have one. */
  call?(ctx: StageContext, target: TargetRef, name: string, data: unknown): Promise<unknown>
}

export type TargetSources = Partial<Record<Exclude<SourceKind, 'workspace'>, TargetSource>>

export interface NotificationSource {
  /** How many of the viewer's notifications are unread, in the team the URL names when it names one; null where there is no team to ask about. */
  unread(ctx: { team?: string; session?: unknown }): Promise<number | null>
}

/** The answer when no account source is contributed: this computer, no user, no teams, everything visible. */
export const LOCAL_VIEWER: Required<ShellViewer> = { user: null, teams: [], currentTeam: null, links: [], scopes: ['*'] }

export const viewerOf = async (source: AccountSource | undefined, ctx: { team?: string; session?: unknown }): Promise<Required<ShellViewer>> => {
  if (!source) return LOCAL_VIEWER
  // An account host that cannot be reached must not stop Studio answering its own part (onboarding reads it).
  const viewer = await source.viewer(ctx).catch(() => LOCAL_VIEWER)
  return { ...viewer, scopes: viewer.scopes ?? LOCAL_VIEWER.scopes }
}

/** The project's own workspace, when it is on this computer. */
export const LOCAL_TARGET_OPTION: TargetOption = { kind: 'workspace', name: 'local', label: null, live: true, production: false, isDefault: true, branch: null, forChanges: false }

const ORDER: Exclude<SourceKind, 'workspace'>[] = ['sandbox', 'stage']

/** This computer's workspace first (where the project is on it), then each contributed kind's targets. A kind that fails is left out. */
export const targetsOf = async (sources: TargetSources | undefined, onComputer: boolean, ctx: StageContext | null): Promise<TargetOption[]> => {
  const lists = ctx ? await Promise.all(ORDER.map((kind) => sources?.[kind]?.list(ctx).catch(() => [] as TargetOption[]) ?? Promise.resolve([] as TargetOption[]))) : []
  const others = lists.flat()
  const local = onComputer ? [LOCAL_TARGET_OPTION] : []
  return [...local, ...others.map((o) => (onComputer && o.kind === 'workspace' ? { ...o, isDefault: false } : o))]
}

/** The kind's source that can call a function there, or null where none can. */
export const targetCaller = (sources: TargetSources | undefined, kind: SourceKind) => {
  if (kind === 'workspace') return null
  const source = sources?.[kind]
  return source?.call ? source : null
}

export type PublishState = { state: StageReleaseStatus; url: string | null }

/** How the latest release of a published copy stands, and where it is live; null where nothing is published. */
export const publishStateOf = async (releases: StageReleases | undefined, ctx: StageContext | null, stage: string | null): Promise<PublishState | null> => {
  if (!releases || !ctx) return null
  const list = await releases.list(ctx, stage)
  const latest = list?.releases[0]
  return list && latest ? { state: latest.status, url: list.url } : null
}

/** The unread count, or null where no notification source is contributed (the bell is then hidden). */
export const unreadOf = async (source: NotificationSource | undefined, ctx: { team?: string; session?: unknown }): Promise<number | null> =>
  source ? source.unread(ctx).catch(() => null) : null
