import { m } from '@/i18n/messages'
import { asI18n, sep, type I18nString } from '@pikku/react'
import { useNavigate } from '@tanstack/react-router'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useProjectKey } from '../lib/project'
import { Meta, Pill } from './parts'
import type { State } from './data'

type Status = 'open' | 'claimed' | 'in_progress' | 'needs_answer' | 'done' | 'dismissed'
export type PanelChange = {
  changeId: string
  shortId: string
  title: string
  status: Status
  awaitingApproval?: boolean
  createdAt?: string | Date | null
  source?: 'panel' | 'console' | 'system'
}

const SOURCE = { panel: m.changes_timeline__from_app, console: m.changes_timeline__from_console, system: m.changes_timeline__found_automatically }

export const stateOf = (c: Pick<PanelChange, 'status' | 'awaitingApproval'>): State => {
  if (c.status === 'needs_answer' || (c.status === 'open' && c.awaitingApproval)) return 'needs'
  if (c.status === 'claimed' || c.status === 'in_progress') return 'working'
  if (c.status === 'open') return 'waiting'
  return c.status === 'done' ? 'done' : 'aside'
}

export const ago = (when: string | Date | null | undefined, now = Date.now()): I18nString | undefined => {
  if (!when) return undefined
  const minutes = Math.max(0, Math.round((now - new Date(when).getTime()) / 60000))
  if (minutes < 1) return m.changes_timeline__just_now()
  if (minutes < 60) return m.changes_timeline__minutes_ago({ count: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 24) return m.changes_timeline__hours_ago({ count: hours })
  return m.changes_timeline__days_ago({ count: Math.round(hours / 24) })
}

const RANK: Record<State, number> = { needs: 0, working: 1, waiting: 2, done: 3, aside: 4 }

export const forPanel = (changes: PanelChange[]) =>
  changes
    .map((c) => ({ c, state: stateOf(c) }))
    .filter((x) => x.state !== 'aside')
    .sort((a, b) => RANK[a.state] - RANK[b.state] || new Date(b.c.createdAt ?? 0).getTime() - new Date(a.c.createdAt ?? 0).getTime())

function Dock({ working, waiting }: { working?: PanelChange; waiting: number }) {
  if (!working && !waiting) return null
  return (
    <div className="flex flex-col gap-2 border-b border-border bg-secondary px-5 py-4">
      {working ? (
        <div className="flex items-center gap-2">
          <span className="size-2.5 shrink-0 animate-pulse rounded-full bg-info" />
          <span className="min-w-0 flex-1 text-[15px]">
            <b>{m.changes_b__working_on()}</b>
            {sep(' ')}
            {asI18n(working.title)}
          </span>
        </div>
      ) : null}
      {waiting ? (
        <span className="text-[14px] text-ink-2">
          <b className="text-warning-foreground">{m.changes_b__waiting_count({ count: waiting })}</b>
          {sep(' ')}
          {m.changes_b__waiting_tail({ count: waiting })}
        </span>
      ) : null}
    </div>
  )
}

export function ChangesPanel() {
  const nav = useNavigate()
  const key = useProjectKey()
  const q = usePikkuQuery('studio:changes', { key }, { enabled: !!key, refetchInterval: 5000 } as never)
  const rows = forPanel(((q.data as { changes: PanelChange[] } | undefined)?.changes ?? []))
  const pick = (id: string) => nav({ to: '/changes' as never, search: ((p: Record<string, unknown>) => ({ ...p, change: id, panel: 'changes' })) as never })
  if (!key || q.isPending) return <p className="px-5 py-4 text-[15px] text-ink-2">{m.changes_timeline__loading()}</p>
  if (q.isError) return <p className="px-5 py-4 text-[15px] text-ink-2">{m.changes_timeline__error()}</p>
  if (!rows.length) return <p className="px-5 py-4 text-[15px] text-ink-2">{m.changes_timeline__empty()}</p>
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-auto">
      <Dock working={rows.find((x) => x.state === 'working')?.c} waiting={rows.filter((x) => x.state === 'needs').length} />
      <ul className="flex flex-col gap-2.5 px-5 py-4">
        {rows.map(({ c, state }) => (
          <li key={c.changeId}>
            <button type="button" onClick={() => pick(c.changeId)} className="flex w-full cursor-pointer flex-col items-start gap-1.5 rounded-[16px] border-[1.5px] border-border bg-card p-4 text-start transition-colors hover:border-muted-foreground">
              <Pill s={state} small />
              <b className="text-[16px] leading-[1.3]">{asI18n(c.title)}</b>
              <span className="text-[13px] text-muted-foreground">
                <Meta items={[c.source ? SOURCE[c.source]() : undefined, asI18n(c.shortId), ago(c.createdAt)]} />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
