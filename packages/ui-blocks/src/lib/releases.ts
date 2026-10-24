import { useMemo } from 'react'
import { m } from '@/i18n/messages'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useProjectKey } from './project'
import { useProjectTarget } from './project-target'

export type ReleaseStatus = 'live' | 'was-live' | 'rolled-back' | 'failed' | 'cancelled' | 'working' | 'waiting'
export type ReleaseWait = 'approval' | 'config' | 'attention' | 'builder'
export type ReleaseFailedAt = 'build' | 'tests' | 'start' | 'publish' | 'data'
export type ReleaseChange = 'added' | 'changed' | 'removed'
export type ReleaseGroupId = 'functions' | 'routes' | 'jobs' | 'migrations' | 'secrets' | 'variables' | 'parts'

export type ReleaseGroup = { id: ReleaseGroupId; items: { change: ReleaseChange; name: string }[] }
export type ReleaseFlag = { id: string; level: 'security' | 'breaking' | 'tests'; name: string; why: string }
export type ReleaseMissing = { name: string; kind: 'secret' | 'variable'; description: string | null }
export type ReleaseTests = { passed: number; failed: number; skipped: number }

export type Release = {
  id: string
  version: string
  title: string | null
  by: string | null
  at: number
  liveAt: number | null
  status: ReleaseStatus
  wait: ReleaseWait | null
  failedAt: ReleaseFailedAt | null
  reason: string | null
  progress: string | null
  step: number
  groups: ReleaseGroup[]
  missing: ReleaseMissing[]
}

export type PendingSave = { id: string; title: string; by: string | null; at: number }

export type ReleaseActions = {
  approve: (id: string) => Promise<void>
  dismiss: (id: string) => Promise<void>
  recheck: (id: string) => Promise<boolean>
  fill: (item: ReleaseMissing, value: string) => Promise<void>
  goBack: ((id: string) => Promise<void>) | null
  tryAgain: (id: string) => Promise<void>
  setAutoUpdate: (on: boolean) => Promise<void>
}

export type ReleasesView = {
  state: 'loading' | 'error' | 'off' | 'ready'
  error: unknown
  retry: () => void
  place: string | null
  url: string | null
  releases: Release[]
  pending: PendingSave[]
  autoUpdate: boolean | null
  readOnly: boolean
  actions: ReleaseActions | null
}

export type ReleaseDetail = {
  flags: ReleaseFlag[]
  tests: ReleaseTests | null
  log: string | null
  logLoading: boolean
  logError: unknown
}

export const RELEASE_STEPS = 5

type Commit = { sha: string; title: string; summary: string; by: string; at: number }

function useLocalReleases(key: string, wanted: boolean): ReleasesView {
  const query = usePikkuQuery('studio:listVersions', { key }, { enabled: !!key && wanted } as never)
  const data = query.data as { live: Commit[]; ahead: Commit[] } | undefined
  return useMemo(
    () => ({
      state: query.isError ? 'error' : !data ? 'loading' : 'off',
      error: query.error,
      retry: () => void query.refetch(),
      place: null,
      url: null,
      releases: [],
      pending: (data?.ahead ?? []).map((c) => ({ id: c.sha, title: c.title, by: c.by, at: c.at })),
      autoUpdate: null,
      readOnly: true,
      actions: null,
    }),
    [data, query.isError, query.error],
  )
}

type Remote = {
  place: { production: boolean; name: string }
  url: string | null
  releases: Release[]
  pending: PendingSave[]
  autoUpdate: boolean
  canGoBack: boolean
  moving: boolean
}
type Act = { action: 'approve' | 'dismiss' | 'recheck' | 'goBack' | 'tryAgain'; id: string } | { action: 'fill'; kind: 'secret' | 'variable'; name: string; value: string } | { action: 'autoUpdate'; on: boolean }
type Flag = { id: string; level: ReleaseFlag['level']; name: string; reason: keyof typeof WHY; text?: string; count?: number }

const WHY = {
  'tests-failed': m.release_flags__tests_failed_why,
  'function-removed': m.release_flags__fn_removed_why,
  'function-version-removed': m.release_flags__fn_version_removed_why,
  'unit-removed': m.release_flags__unit_removed_why,
  'route-removed': m.release_flags__route_removed_why,
  'handler-removed': m.release_flags__handler_removed_why,
  'workflow-removed': m.release_flags__workflow_removed_why,
  'webhook-removed': m.release_flags__webhook_removed_why,
  'migration-destructive': m.release_flags__migration_destructive_why,
  security: null,
} as const

/** The published copy the open target names; null asks the host for production. */
const useStage = () => {
  const target = useProjectTarget()
  return target.kind === 'stage' ? target.name : null
}

/**
 * The open project's releases. Where the host publishes it (its studio:projectReleases answers), those of the copy
 * the target names, or of production; otherwise only the saved work this computer has not published.
 */
export function useReleases(): ReleasesView {
  const key = useProjectKey()
  const stage = useStage()
  const remote = usePikkuQuery('studio:projectReleases', { key, stage }, { enabled: !!key, refetchInterval: (q: { state: { data?: { releases: Remote | null } } }) => (q.state.data?.releases?.moving ? 4000 : false) } as never)
  const data = remote.data as { releases: Remote | null } | undefined
  const local = useLocalReleases(key, !!data && !data.releases)
  const act = usePikkuMutation('studio:projectReleaseAction')
  return useMemo<ReleasesView>(() => {
    if (remote.isError) return { ...local, state: 'error', error: remote.error, retry: () => void remote.refetch() }
    if (!data) return { ...local, state: 'loading' }
    const view = data.releases
    if (!view) return local
    const run = async (a: Act) => {
      const r = (await act.mutateAsync({ key, stage, act: a } as never)) as { allClear: boolean }
      await remote.refetch()
      return r.allClear
    }
    return {
      state: 'ready',
      error: null,
      retry: () => void remote.refetch(),
      place: view.place.production ? m.release_flags__place_live() : view.place.name,
      url: view.url,
      releases: view.releases,
      pending: view.pending,
      autoUpdate: view.autoUpdate,
      readOnly: false,
      actions: {
        approve: async (id) => void (await run({ action: 'approve', id })),
        dismiss: async (id) => void (await run({ action: 'dismiss', id })),
        recheck: (id) => run({ action: 'recheck', id }),
        fill: async (item, value) => void (await run({ action: 'fill', kind: item.kind, name: item.name, value })),
        goBack: view.canGoBack ? async (id) => void (await run({ action: 'goBack', id })) : null,
        tryAgain: async (id) => void (await run({ action: 'tryAgain', id })),
        setAutoUpdate: async (on) => void (await run({ action: 'autoUpdate', on })),
      },
    }
  }, [data, remote.isError, remote.error, local, key, stage])
}

export function useReleaseDetail(id: string, wanted: boolean): ReleaseDetail {
  const key = useProjectKey()
  const stage = useStage()
  const query = usePikkuQuery('studio:projectReleaseDetail', { key, stage, id }, { enabled: !!key && wanted } as never)
  const detail = (query.data as { detail: { flags: Flag[]; tests: ReleaseTests | null; log: string | null } | null } | undefined)?.detail
  return useMemo<ReleaseDetail>(
    () => ({
      flags: (detail?.flags ?? []).map((f) => ({
        id: f.id,
        level: f.level,
        name: f.reason === 'tests-failed' ? m.release_flags__tests_failed_name({ count: f.count ?? 0 }) : f.name,
        why: WHY[f.reason]?.() ?? f.text ?? '',
      })),
      tests: detail?.tests ?? null,
      log: detail?.log ?? null,
      logLoading: wanted && query.isPending,
      logError: query.error,
    }),
    [detail, wanted, query.isPending, query.error],
  )
}

export function useReleasePreview(): ReleaseGroup[] | null {
  const key = useProjectKey()
  const stage = useStage()
  const query = usePikkuQuery('studio:projectReleasePreview', { key, stage }, { enabled: !!key } as never)
  return (query.data as { groups: ReleaseGroup[] | null } | undefined)?.groups ?? null
}
