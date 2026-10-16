import { useMemo } from 'react'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useProjectKey } from './project'
import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'

export type Outcome = 'live' | 'was-live' | 'failed' | 'rolled-back' | 'cancelled' | 'working' | 'waiting'

export type Flag = { id: string; level: 'security' | 'breaking' | 'tests'; text: I18nString }
export type Missing = { id: string; kind: 'secret' | 'setting'; name: I18nString; why: I18nString; placeholder: I18nString }
export type Group = { label: I18nString; added: I18nString[]; removed: I18nString[]; changed: I18nString[] }

export type Version = {
  id: string
  v: string
  sha: string
  title: I18nString
  summary: I18nString
  day: string
  time: string
  by: I18nString
  outcome: Outcome
  reason?: I18nString
  failedAt?: 'build' | 'start' | 'publish' | 'data'
  took?: string
  liveSince?: string
  replaces?: string
  visits?: number
  phase?: number
  started?: string
  tests?: { passed: number; failed: number; skipped: number; secs: number }
  flags: Flag[]
  missing: Missing[]
  includes?: string[]
  groups: Group[]
  log: string
}

export const steps = [
  ['Fetching your work', 25],
  ['Building it', 150],
  ['Testing it', 60],
  ['Checking it', 15],
  ['Going live', 70],
] as Array<[string, number]>

export type Head = { sha: string; title: I18nString; by: I18nString; when: I18nString }

type Commit = { sha: string; title: string; summary: string; by: string; at: number }

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

const dayOf = (at: number): I18nString => {
  const d = new Date(at)
  if (sameDay(d, new Date())) return m.versions__today()
  const text = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
  return asI18n(text)
}

const timeOf = (at: number) => {
  const text = new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
  return asI18n(text)
}

const ago = (at: number): I18nString => {
  const minutes = Math.max(0, Math.round((Date.now() - at) / 60000))
  if (minutes < 1) return m.versions__just_now()
  if (minutes < 60) return m.versions__minutes_ago({ count: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 24) return m.versions__hours_ago_count({ count: hours })
  return m.versions__day_time({ day: dayOf(at), time: timeOf(at) })
}

export function useVersions(): { versions: Version[]; heads: Head[]; loading: boolean } {
  const key = useProjectKey()
  const query = usePikkuQuery('studio:listVersions', { key }, { enabled: !!key } as never)
  const data = query.data as { live: Commit[]; ahead: Commit[] } | undefined
  return useMemo(() => {
    const live = data?.live ?? []
    const versions = live.map(
      (c, i): Version => ({
        id: c.sha,
        v: `v${live.length - i}`,
        sha: c.sha,
        title: asI18n(c.title),
        summary: asI18n(c.summary),
        day: dayOf(c.at),
        time: timeOf(c.at),
        by: asI18n(c.by),
        outcome: i === 0 ? 'live' : 'was-live',
        flags: [],
        missing: [],
        groups: [],
        log: '',
      })
    )
    const heads = (data?.ahead ?? []).map((c): Head => ({ sha: c.sha, title: asI18n(c.title), by: asI18n(c.by), when: ago(c.at) }))
    return { versions, heads, loading: query.isLoading }
  }, [data, query.isLoading])
}
