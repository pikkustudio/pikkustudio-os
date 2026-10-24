import { m } from '@/i18n/messages'
import type { I18nString } from '@pikku/react'
import { BlobStage } from '../blocks/BlobStage'
import { EmptyState } from '../blocks/EmptyState'
import { Link } from '../blocks/Link'
import { useContext, type ReactNode } from 'react'
import { useProjectKey, useProjectName } from '../lib/project'
import { useProjectQuery } from '../lib/projectRpc'
import { Button } from '../ui/button'
import { ChevronRight, Blocks } from 'lucide-react'
import { ShellCtx } from '../lib/shell'
import { keep, withoutPageParams } from '../lib/links'
import { useFrontDoors, API_KINDS } from '../lib/frontDoors'


const dot = { ok: 'bg-success ring-success-soft', warn: 'bg-warning ring-card', info: 'bg-info ring-info-soft' }

const PAGE_OF: Record<string, '/workflows' | '/scheduled-tasks' | '/queues' | '/emails' | '/functions' | '/live-connections' | undefined> = { functions: '/functions', channels: '/live-connections', mcpTools: '/functions', workflows: '/workflows', schedulers: '/scheduled-tasks', queues: '/queues', emails: '/emails' }

/** The parts an app is made of; a function so the words follow the language. */
const areas = (): Array<[I18nString, string, I18nString, I18nString]> => [
  [m.overview_screen__area_functions_title(), 'functions', m.overview_screen__area_functions_detail(), m.overview_screen__area_functions_name()],
  [m.overview_screen__area_workflows_title(), 'workflows', m.overview_screen__area_workflows_detail(), m.overview_screen__area_workflows_name()],
  [m.overview_screen__area_agents_title(), 'agents', m.overview_screen__area_agents_detail(), m.overview_screen__area_agents_name()],
  [m.overview_screen__area_channels_title(), 'channels', m.overview_screen__area_channels_detail(), m.overview_screen__area_channels_name()],
  [m.overview_screen__area_mcptools_title(), 'mcpTools', m.overview_screen__area_mcptools_detail(), m.overview_screen__area_mcptools_name()],
  [m.overview_screen__area_gateways_title(), 'gateways', m.overview_screen__area_gateways_detail(), m.overview_screen__area_gateways_name()],
  [m.overview_screen__area_schedulers_title(), 'schedulers', m.overview_screen__area_schedulers_detail(), m.overview_screen__area_schedulers_name()],
  [m.overview_screen__area_queues_title(), 'queues', m.overview_screen__area_queues_detail(), m.overview_screen__area_queues_name()],
  [m.overview_screen__area_emails_title(), 'emails', m.overview_screen__area_emails_detail(), m.overview_screen__area_emails_name()],
]

/** A host's own cards on the Overview: the published app's health, and the project's workspaces. */
export type OverviewExtraCards = { liveHealth?: ReactNode; workspaces?: ReactNode }

export function OverviewScreen({ extraCards = {} }: { extraCards?: OverviewExtraCards } = {}) {
  const projectName = useProjectName()
  const meta = useProjectQuery<{ counts?: Record<string, number>; workflows?: Record<string, { scenario?: boolean; source?: string }> }>(useProjectKey(), 'console:getAllMeta', {}).data
  const counts: Record<string, number> = { ...meta?.counts, ...(meta?.workflows ? { workflows: Object.values(meta.workflows).filter((w) => !w.scenario && w.source !== 'scenario').length } : {}) }
  const { pending, open } = useContext(ShellCtx)
  const doorCount = useFrontDoors(useProjectKey()).doors.filter((d) => !API_KINDS.includes(d.kind)).length
  const built = (counts.functions ?? 0) > 0 || doorCount > 0

  const parts = [
    [m.front_doors__title(), '', m.overview_screen__front_doors_text(), doorCount] as const,
    ...areas().map(([title, countKey, detail]) => [title, countKey, detail, counts[countKey] ?? 0] as const),
  ].filter(([, , , count]) => count > 0)

  return (
    <div className="mx-auto flex max-w-[1160px] flex-col gap-9 @min-[1700px]/app:max-w-[1380px]">
      <section data-testid="next-card" data-hue="teal" className="relative grid grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] overflow-hidden rounded-next @max-[640px]/app:grid-cols-1 bg-hero text-hero-ink" aria-label={m.overview_screen__welcome_title({ name: projectName })}>
        <div className="relative z-1 flex flex-col justify-center gap-3.5 px-10 pt-8.5 pb-9 @max-[640px]/app:px-6 @max-[640px]/app:py-8">
          <h1 className="max-w-ch20 text-[40px] leading-[1.08] tracking-[-0.02em] text-hero-ink font-bold text-balance">{m.overview_screen__welcome_title({ name: projectName })}</h1>
          <p className="max-w-ch54 text-[17.5px] leading-[1.5] text-hero-ink-2 text-pretty">
            {pending.length ? m.overview_screen__need_look({ count: pending.length }) : built ? m.overview_screen__welcome_text() : m.overview_screen__welcome_text_new()}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3.5">
            <Button variant="hero" size="pageLg" type="button" onClick={() => open('chat')}>
              {built ? m.overview_screen__ask_for_change() : m.overview_screen__describe_what_you_want()}
            </Button>
            <Button asChild variant="heroGhost" size="pageLg">
              <Link {...keep} to="/design">
                <ChevronRight className="rtl:-scale-x-100 size-4.5" />
                {m.overview_screen__open_your_app()}
              </Link>
            </Button>
          </div>
        </div>
        <div className="relative min-h-72 @max-[640px]/app:hidden">
          <BlobStage step={pending.length ? 'question' : 'choosing'} size={380} />
        </div>
      </section>

      {pending.length ? (
        <section data-testid="health-row" className="flex flex-col gap-3.5" aria-label={m.overview_screen__how_going()}>
          <h2 className="text-[24px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">{m.overview_screen__need_look({ count: pending.length })}</h2>
          <div className="rounded-card border border-border bg-card shadow-card">
            {pending.map((c) => (
              <div key={c.title} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-b border-border px-6 py-4.5 last:border-b-0">
                <span className={`mx-1 size-3 shrink-0 rounded-full ring-4 ${dot.warn}`} />
                <div>
                  <b className="block text-[17px] leading-[1.3]">{c.title}</b>
                  <p className="text-[15px] text-ink-2 text-pretty">{c.body ?? m.overview_screen__waiting()}</p>
                </div>
                <Button variant="quiet" size="link" type="button" onClick={() => open('updates')}>
                  {m.overview_screen__see_updates()}
                  <ChevronRight className="rtl:-scale-x-100 size-4" strokeWidth={2.5} />
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {extraCards.liveHealth ?? null}

      {extraCards.workspaces ?? null}

      <section className="flex flex-col gap-3.5" aria-label={m.overview_screen__made_of()}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="text-[24px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">{m.overview_screen__made_of_title()}</h2>
          {parts.length ? <p className="max-w-ch54 text-[15px] text-muted-foreground text-pretty">{m.overview_screen__made_of_hint()}</p> : null}
        </div>
        {!parts.length ? (
          <EmptyState icon={Blocks} title={m.overview_screen__no_parts()} text={m.overview_screen__no_parts_text()} />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3.5 @max-[640px]/app:grid-cols-1">
              {parts.map(([title, countKey, detail, count]) => {
                const to = countKey === '' ? '/front-doors' : PAGE_OF[countKey]
                const row = 'grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3.5 rounded-card border border-border bg-card px-6 py-4 text-start shadow-card'
                const body = (
                  <>
                    <span>
                      <b className="block text-[16px]">{title}</b>
                      <small className="block text-[14px] leading-[1.4] text-muted-foreground">{detail}</small>
                    </span>
                    <span className="min-w-[2ch] text-end font-heading text-[26px] font-bold tabular-nums">{count}</span>
                    {to ? <ChevronRight className="rtl:-scale-x-100 size-4.5 text-muted-foreground" /> : <span className="size-4.5" />}
                  </>
                )
                return to ? (
                  <Link key={title} {...keep} to={to} search={countKey === 'mcpTools' ? ((prev: object) => ({ ...withoutPageParams(prev), reach: 'helper' })) as never : keep.search} className={`${row} transition-colors duration-140 hover:bg-secondary active:bg-surface-3`}>
                    {body}
                  </Link>
                ) : (
                  <div key={title} className={row}>
                    {body}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>
    </div>
  )
}
