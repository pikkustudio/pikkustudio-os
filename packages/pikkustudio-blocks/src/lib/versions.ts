import { useMemo } from 'react'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useProjectKey } from './project'
import type { Version } from '../mocks/versions'

export { steps, type Version } from '../mocks/versions'

export type Head = { sha: string; title: string; by: string; when: string }

type Commit = { sha: string; title: string; summary: string; by: string; at: number }

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

const dayOf = (at: number) => {
  const d = new Date(at)
  return sameDay(d, new Date()) ? 'Today' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

const timeOf = (at: number) => new Date(at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

const ago = (at: number) => {
  const minutes = Math.max(0, Math.round((Date.now() - at) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minutes ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
  return `${dayOf(at)}, ${timeOf(at)}`
}

/** A version is a commit on the live branch; what is ahead of it is "not live yet". */
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
        title: c.title,
        summary: c.summary,
        day: dayOf(c.at),
        time: timeOf(c.at),
        by: c.by,
        outcome: i === 0 ? 'live' : 'was-live',
        flags: [],
        missing: [],
        groups: [],
        log: '',
      })
    )
    const heads = (data?.ahead ?? []).map((c): Head => ({ sha: c.sha, title: c.title, by: c.by, when: ago(c.at) }))
    return { versions, heads, loading: query.isLoading }
  }, [data, query.isLoading])
}
