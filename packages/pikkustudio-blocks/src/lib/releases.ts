import { useMemo } from 'react'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useProjectKey } from './project'
import { useSlots } from './slots'
import { useLiveUpdates } from './live'

export type ReleaseStatus = 'live' | 'was-live' | 'rolled-back' | 'failed' | 'cancelled' | 'working' | 'waiting'
export type ReleaseWait = 'approval' | 'config' | 'attention' | 'builder'
export type ReleaseFailedAt = 'build' | 'start' | 'publish' | 'data'
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

function useLocalReleases(key: string): ReleasesView {
  const query = usePikkuQuery('studio:listVersions', { key }, { enabled: !!key } as never)
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

const noDetail: ReleaseDetail = { flags: [], tests: null, log: null, logLoading: false, logError: null }
const useNoDetail = (): ReleaseDetail => noDetail

export function useReleases(): ReleasesView {
  const key = useProjectKey()
  const slots = useSlots()
  const source = slots.useReleases ?? useLocalReleases
  useLiveUpdates(['studio:listVersions', 'listDeployments', 'getProjectDeployments', 'getProjectRelease', 'listStages'])
  return source(key)
}

export function useReleaseDetail(id: string, wanted: boolean): ReleaseDetail {
  const key = useProjectKey()
  const source = useSlots().useReleaseDetail ?? useNoDetail
  return source(key, id, wanted)
}
