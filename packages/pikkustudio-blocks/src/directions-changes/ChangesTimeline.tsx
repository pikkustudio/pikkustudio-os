import { useState } from 'react'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useProjectKey } from '../lib/project'
import { Pill } from './parts'
import type { State } from './data'

type Status = 'open' | 'claimed' | 'in_progress' | 'needs_answer' | 'done' | 'dismissed'
export type RealChange = { changeId: string; shortId: string; groupId: string | null; title: string; body: string | null; status: Status }
type Group = { groupId: string; title: string }

const STATE: Record<Status, State> = { open: 'waiting', claimed: 'working', in_progress: 'working', needs_answer: 'needs', done: 'done', dismissed: 'aside' }

export const timelineSections = (changes: RealChange[], groups: Group[]) => {
  const sets = groups.map((g) => ({ id: g.groupId, title: g.title, items: changes.filter((c) => c.groupId === g.groupId) }))
  const loose = changes.filter((c) => !c.groupId && c.status !== 'dismissed')
  return [...sets, ...(loose.length ? [{ id: 'waiting', title: 'Waiting its turn', items: loose }] : [])].filter((s) => s.items.length > 0)
}

export function Timeline({ changes, groups }: { changes: RealChange[]; groups: Group[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const sections = timelineSections(changes, groups)
  if (sections.length === 0) return <p className="text-[15px] text-ink-2">No changes yet. Tell Pikku what to change and it will show up here.</p>
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6">
      {sections.map((s) => (
        <section key={s.id} className="flex flex-col gap-3">
          <h2 className="pl-1 text-[22px] font-bold">{s.title}</h2>
          <ol className="flex flex-col gap-2.5">
            {s.items.map((c) => (
              <li key={c.changeId}>
                <button
                  type="button"
                  aria-expanded={open === c.changeId}
                  onClick={() => setOpen(open === c.changeId ? null : c.changeId)}
                  className="flex w-full cursor-pointer flex-col items-start gap-1.5 rounded-[20px] border-[1.5px] border-border bg-card p-5 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Pill s={STATE[c.status]} small />
                    <span className="text-[13px] text-muted-foreground">{c.shortId}</span>
                  </div>
                  <b className="text-[18px] leading-[1.3]">{c.title}</b>
                  {open === c.changeId && c.body ? <p className="whitespace-pre-wrap text-[15px] text-ink-2">{c.body}</p> : null}
                </button>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  )
}

export function ChangesTimeline() {
  const key = useProjectKey()
  const q = usePikkuQuery('studio:changes', { key }, { enabled: !!key, refetchInterval: 5000 } as never)
  const data = q.data as { changes: RealChange[]; groups: Group[] } | undefined
  if (!key || q.isPending) return <p className="text-[15px] text-ink-2">Loading your changes...</p>
  if (q.isError) return <p className="text-[15px] text-ink-2">Could not load your changes. Try again in a moment.</p>
  return <Timeline changes={data?.changes ?? []} groups={data?.groups ?? []} />
}
