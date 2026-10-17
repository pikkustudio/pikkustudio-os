import { useContext, useMemo, useState } from 'react'
import type { I18nNode, I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { asI18n } from '@pikku/react'
import { History, LockKeyhole, Plug, SearchX } from 'lucide-react'
import { useProjectQuery } from '../lib/projectRpc'
import { useProjectKey, useProjectName } from '../lib/project'
import { Button } from '../ui/button'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { NextCard } from '../blocks/NextCard'
import { EmptyState } from '../blocks/EmptyState'
import { QueryState } from '../blocks/QueryState'
import { RowStack } from '../blocks/RowCard'
import { Segmented } from '../blocks/Segmented'
import { PikkuDot } from '../blocks/PikkuDot'
import { AuditEntryRow } from '../blocks/AuditEntryRow'
import { AuditDetail } from '../blocks/AuditDetail'
import { Art } from '../blocks/ExploreHub'
import { ShellCtx } from '../lib/shell'
import { auditProblem, dayGroup, type AuditEntry, type AuditUser } from '../lib/audit'

type Page = { events: AuditEntry[]; users: Record<string, AuditUser>; nextCursor: number | null; readable: boolean }
type Filters = { users: Array<{ userId: string; name?: string; email?: string }>; types: string[] }

const PAGE = 50
type Range = 'today' | 'week' | 'all'

const skeleton = <div className="h-24 animate-pulse rounded-card border border-border bg-secondary" />

const Group = ({ title, children }: { title: I18nString; children: I18nNode }) => (
  <section className="flex flex-col gap-2" aria-label={title}>
    <h2 className="px-1 pt-2 text-px14 font-bold text-muted-foreground">{title}</h2>
    {children}
  </section>
)

const since = (range: Range, now: number): string | undefined => {
  if (range === 'all') return undefined
  if (range === 'week') return new Date(now - 7 * 86_400_000).toISOString()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  return start.toISOString()
}

export function AuditScreen() {
  const { say } = useContext(ShellCtx)
  const key = useProjectKey()
  const projectName = useProjectName()
  const [who, setWho] = useState<string | null>(null)
  const [range, setRange] = useState<Range>('all')
  const [limit, setLimit] = useState(PAGE)
  const [open, setOpen] = useState<AuditEntry | null>(null)
  const [stamp] = useState(() => Date.now())
  const from = useMemo(() => since(range, stamp), [range, stamp])
  const filters = useProjectQuery<Filters>(key, 'admin:getAuditFilters', {}, { handlesErrors: true })
  const audits = useProjectQuery<Page>(key, 'admin:getAudits', { limit, ...(who ? { userIds: [who] } : {}), ...(from ? { from } : {}) }, { handlesErrors: true })
  const now = audits.dataUpdatedAt || stamp
  const data = audits.data
  const entries = (data?.events ?? []) as AuditEntry[]
  const unreadable = !!data && !data.readable
  const filtered = !!who || range !== 'all'
  const problem = audits.isError ? auditProblem(audits.error) : null

  const heroTitle = problem && problem !== 'other' ? m.audit_screen__hero_unavailable_title() : unreadable ? m.audit_screen__hero_unreadable_title() : data && entries.length === 0 && !filtered ? m.audit_screen__hero_empty_title() : m.audit_screen__hero_title()
  const heroText = problem && problem !== 'other' ? m.audit_screen__hero_unavailable_text() : unreadable ? m.audit_screen__hero_unreadable_text() : data && entries.length === 0 && !filtered ? m.audit_screen__hero_empty_text() : m.audit_screen__hero_text()

  const reset = () => {
    setWho(null)
    setRange('all')
    setLimit(PAGE)
  }

  const groups: Array<[I18nString, AuditEntry[]]> = [
    [m.audit_screen__today(), entries.filter((e) => dayGroup(e.occurredAt, now) === 'today')],
    [m.audit_screen__yesterday(), entries.filter((e) => dayGroup(e.occurredAt, now) === 'yesterday')],
    [m.audit_screen__earlier(), entries.filter((e) => dayGroup(e.occurredAt, now) === 'older')],
  ]

  return (
    <Page gap="snug">
      <PageHead crumb={projectName} title={m.audit_screen__title()} text={m.audit_screen__text()} size="lead" developerDetails />

      <NextCard label={m.audit_screen__title()} hue="sea" art={<Art />} title={heroTitle} why={heroText}>
        <div>
          <Button variant="hero" size="pageLg" type="button" onClick={() => say(m.audit_screen__ask_say())}>
            <PikkuDot />
            {m.audit_screen__ask_pikku()}
          </Button>
        </div>
      </NextCard>

      {problem === 'not-running' ? (
        <EmptyState icon={Plug} title={m.audit_screen__not_running_title()} text={m.audit_screen__not_running_text()} />
      ) : problem === 'no-addon' ? (
        <EmptyState icon={History} title={m.audit_screen__no_addon_title()} text={m.audit_screen__no_addon_text()}>
          <Button type="button" size="page" onClick={() => say(m.audit_screen__add_it_say())}>
            <PikkuDot />
            {m.audit_screen__add_it()}
          </Button>
        </EmptyState>
      ) : problem === 'forbidden' ? (
        <EmptyState icon={LockKeyhole} title={m.audit_screen__cannot_see()} text={m.audit_screen__cannot_see_text()}>
          <Button type="button" size="page" onClick={() => say(m.audit_screen__ask_access_say())}>
            <PikkuDot />
            {m.audit_screen__ask_access()}
          </Button>
        </EmptyState>
      ) : unreadable ? (
        <EmptyState icon={History} title={m.audit_screen__hero_unreadable_title()} text={m.audit_screen__unreadable_text()}>
          <Button type="button" size="page" onClick={() => say(m.audit_screen__unreadable_say())}>
            <PikkuDot />
            {m.audit_screen__ask_pikku_fix()}
          </Button>
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Segmented
              label={m.audit_screen__detail_when()}
              value={range}
              options={[
                ['today', m.audit_screen__range_today()],
                ['week', m.audit_screen__range_week()],
                ['all', m.audit_screen__range_all()],
              ]}
              onChange={(v) => {
                setRange(v as Range)
                setLimit(PAGE)
              }}
            />
            {filters.data && filters.data.users.length > 1 ? (
              <div role="group" aria-label={m.audit_screen__who()} className="flex flex-wrap gap-2">
                <Button type="button" variant="filter" size="filter" aria-pressed={!who} onClick={() => { setWho(null); setLimit(PAGE) }}>
                  {m.audit_screen__everyone()}
                </Button>
                {filters.data.users.map((u) => (
                  <Button key={u.userId} type="button" variant="filter" size="filter" aria-pressed={who === u.userId} onClick={() => { setWho(u.userId); setLimit(PAGE) }}>
                    {asI18n(u.name || u.email || u.userId)}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>

          <QueryState
            query={audits}
            skeleton={skeleton}
            empty={(d) =>
              d.events.length === 0 && d.readable ? (
                filtered ? (
                  <EmptyState icon={SearchX} title={m.audit_screen__nothing_matches()} text={m.audit_screen__nothing_matches_text()}>
                    <Button type="button" variant="bordered" size="page" onClick={reset}>
                      {m.audit_screen__show_everything()}
                    </Button>
                  </EmptyState>
                ) : (
                  <EmptyState icon={History} title={m.audit_screen__hero_empty_title()} text={m.audit_screen__hero_empty_text()} />
                )
              ) : null
            }
          >
            {(d) => (
              <div className="flex min-w-0 flex-col gap-6.5">
                {groups
                  .filter(([, list]) => list.length > 0)
                  .map(([title, list]) => (
                    <Group key={title} title={title}>
                      <RowStack>
                        {list.map((entry, i) => (
                          <AuditEntryRow key={entry.eventId ?? `${entry.occurredAt}:${entry.type}:${i}`} entry={entry} users={d.users} now={now} onOpen={() => setOpen(entry)} />
                        ))}
                      </RowStack>
                    </Group>
                  ))}
                {d.nextCursor !== null ? (
                  <div className="flex justify-center">
                    <Button type="button" variant="bordered" size="page" disabled={audits.isFetching} aria-busy={audits.isFetching} onClick={() => setLimit((n) => n + PAGE)}>
                      {m.audit_screen__show_earlier()}
                    </Button>
                  </div>
                ) : null}
                {open ? <AuditDetail entry={open} users={d.users} now={now} onClose={() => setOpen(null)} /> : null}
              </div>
            )}
          </QueryState>
        </>
      )}
    </Page>
  )
}
