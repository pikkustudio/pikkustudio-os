import { m } from '@/i18n/messages'
import { asI18n, type I18nString } from '@pikku/react'
import { useState } from 'react'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useProjectKey } from '../lib/project'
import { Meta, Pill } from './parts'
import type { State } from './data'

type Status = 'open' | 'claimed' | 'in_progress' | 'needs_answer' | 'done' | 'dismissed'
export type RealChange = {
  changeId: string
  shortId: string
  groupId: string | null
  title: string
  body: string | null
  status: Status
  createdAt?: string | Date | null
  createdByName?: string | null
  source?: 'panel' | 'console' | 'system'
}
type Group = { groupId: string; title: string }

const STATE: Record<Status, State> = { open: 'waiting', claimed: 'working', in_progress: 'working', needs_answer: 'needs', done: 'done', dismissed: 'aside' }

const SOURCE = { panel: m.changes_timeline__from_app, console: m.changes_timeline__from_console, system: m.changes_timeline__found_automatically }

export const ago = (when: string | Date | null | undefined, now = Date.now()): I18nString | undefined => {
  if (!when) return undefined
  const minutes = Math.max(0, Math.round((now - new Date(when).getTime()) / 60000))
  if (minutes < 1) return m.changes_timeline__just_now()
  if (minutes < 60) return m.changes_timeline__minutes_ago({ count: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 24) return m.changes_timeline__hours_ago({ count: hours })
  const days = Math.round(hours / 24)
  return m.changes_timeline__days_ago({ count: days })
}

export const byNewest = (a: RealChange, b: RealChange) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()

export const byWho = (c: RealChange): I18nString | undefined => {
  const { createdByName, source } = c
  if (createdByName) return asI18n(createdByName)
  return source ? SOURCE[source]() : undefined
}

/** What the screen draws for one change. The words come from the project and the people using it, so this is where they enter as outside data. */
type Shown = { changeId: string; status: Status; title: I18nString; body?: I18nString; shortId: I18nString; who?: I18nString; when?: I18nString }

const shown = (c: RealChange): Shown => {
  const { changeId, status, title, body, shortId } = c
  return { changeId, status, title: asI18n(title), body: body ? asI18n(body) : undefined, shortId: asI18n(shortId), who: byWho(c), when: ago(c.createdAt) }
}

export const timelineSections = (changes: RealChange[], groups: Group[]) => {
  const sets = groups.map((g) => {
    const { groupId, title } = g
    return { id: groupId, title: asI18n(title), items: changes.filter((c) => c.groupId === groupId).sort(byNewest).map(shown) }
  })
  const loose = changes.filter((c) => !c.groupId && c.status !== 'dismissed').sort(byNewest).map(shown)
  return [...sets, ...(loose.length ? [{ id: 'waiting', title: m.changes_timeline__waiting_its_turn(), items: loose }] : [])].filter((s) => s.items.length > 0)
}

export function Timeline({ changes, groups }: { changes: RealChange[]; groups: Group[] }) {
  const [open, setOpen] = useState<string | null>(null)
  const sections = timelineSections(changes, groups)
  if (sections.length === 0) return <p className="text-[15px] text-ink-2">{m.changes_timeline__empty()}</p>
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6">
      {sections.map((s) => (
        <section key={s.id} className="flex flex-col gap-3">
          <h2 className="ps-1 text-[22px] font-bold">{s.title}</h2>
          <ol className="flex flex-col gap-2.5">
            {s.items.map((c) => (
              <li key={c.changeId}>
                <button
                  type="button"
                  aria-expanded={open === c.changeId}
                  onClick={() => setOpen(open === c.changeId ? null : c.changeId)}
                  className="flex w-full cursor-pointer flex-col items-start gap-1.5 rounded-[20px] border-[1.5px] border-border bg-card p-5 text-start"
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Pill s={STATE[c.status]} small />
                    <span className="text-[13px] text-muted-foreground"><Meta items={[c.who, c.shortId, c.when]} /></span>
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
  if (!key || q.isPending) return <p className="text-[15px] text-ink-2">{m.changes_timeline__loading()}</p>
  if (q.isError) return <p className="text-[15px] text-ink-2">{m.changes_timeline__error()}</p>
  return <Timeline changes={data?.changes ?? []} groups={data?.groups ?? []} />
}
