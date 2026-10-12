import { m } from '@/i18n/messages'
import type { I18nString } from '@pikku/react'
import { BlobStage } from '../blocks/BlobStage'
import { PinButton } from '../blocks/PinButton'
import { EmptyState } from '../blocks/EmptyState'
import { Link } from '../blocks/Link'
import { useContext, useState } from 'react'
import { useProjectKey, useProjectName } from '../lib/project'
import { useProjectQuery } from '../lib/projectRpc'
import { Button } from '../ui/button'
import { Check, ChevronRight, CircleAlert, Info, MessageCircle, RotateCw, Blocks } from 'lucide-react'
import { ShellCtx } from '../lib/shell'
import { keep } from '../lib/links'
import { useFrontDoors, API_KINDS } from '../lib/frontDoors'


const dot = { ok: 'bg-success ring-success-soft', warn: 'bg-warning ring-card', info: 'bg-info ring-info-soft' }

/** The parts an app is made of; a function so the words follow the language. */
const areas = (): Array<[I18nString, string, I18nString, I18nString]> => [
  [m.overview_screen__area_functions_title(), 'functions', m.overview_screen__area_functions_detail(), m.overview_screen__area_functions_name()],
  [m.overview_screen__area_workflows_title(), 'workflows', m.overview_screen__area_workflows_detail(), m.overview_screen__area_workflows_name()],
  [m.overview_screen__area_agents_title(), 'agents', m.overview_screen__area_agents_detail(), m.overview_screen__area_agents_name()],
  [m.overview_screen__area_httproutes_title(), 'httpRoutes', m.overview_screen__area_httproutes_detail(), m.overview_screen__area_httproutes_name()],
  [m.overview_screen__area_channels_title(), 'channels', m.overview_screen__area_channels_detail(), m.overview_screen__area_channels_name()],
  [m.overview_screen__area_mcptools_title(), 'mcpTools', m.overview_screen__area_mcptools_detail(), m.overview_screen__area_mcptools_name()],
  [m.overview_screen__area_clicommands_title(), 'cliCommands', m.overview_screen__area_clicommands_detail(), m.overview_screen__area_clicommands_name()],
  [m.overview_screen__area_gateways_title(), 'gateways', m.overview_screen__area_gateways_detail(), m.overview_screen__area_gateways_name()],
  [m.overview_screen__area_schedulers_title(), 'schedulers', m.overview_screen__area_schedulers_detail(), m.overview_screen__area_schedulers_name()],
  [m.overview_screen__area_queues_title(), 'queues', m.overview_screen__area_queues_detail(), m.overview_screen__area_queues_name()],
  [m.overview_screen__area_emails_title(), 'emails', m.overview_screen__area_emails_detail(), m.overview_screen__area_emails_name()],
]

type Status = { kind: 'ok' | 'bad' | 'wait'; text: I18nString } | undefined


function StatusLine({ status, onHero }: { status: Status; onHero?: boolean }) {
  if (!status) return null
  const tone = onHero ? 'text-hero-ink' : { ok: 'text-success-foreground', bad: 'text-destructive-foreground', wait: 'text-ink-2' }[status.kind]
  return (
    <span className={`inline-flex min-h-6 items-center gap-2 text-[14.5px] leading-[1.35] font-bold ${tone}`} role="status">
      {status.kind === 'ok' ? <Check className="size-4.5" strokeWidth={2.5} /> : null}
      {status.kind === 'bad' ? <CircleAlert className="size-4.5" strokeWidth={2.5} /> : null}
      {status.kind === 'wait' ? <i className="size-4 shrink-0 animate-[spin_0.8s_linear_infinite] rounded-full border-[2.5px] border-current border-e-transparent" /> : null}
      <span>{status.text}</span>
    </span>
  )
}

export function OverviewScreen() {
  const projectName = useProjectName()
  const counts = useProjectQuery<{ counts?: Record<string, number> }>(useProjectKey(), 'console:getAllMeta', {}).data?.counts ?? {}
  const { pending, say, open } = useContext(ShellCtx)
  const doorCount = useFrontDoors(useProjectKey()).doors.filter((d) => !API_KINDS.includes(d.kind)).length
  const [checking, setChecking] = useState(false)
  const [checked, setChecked] = useState<Status>()
  const [introHidden, setIntroHidden] = useState(false)
  const [areaMsg, setAreaMsg] = useState<Status>()

  const check = () => {
    setChecking(true)
    setChecked({ kind: 'wait', text: m.overview_screen__looking_again() })
    window.setTimeout(() => {
      setChecking(false)
      setChecked({
        kind: 'ok',
        text: pending.length ? m.overview_screen__checked_waiting({ count: pending.length }) : m.overview_screen__checked_none(),
      })
    }, 700)
  }

  return (
    <div className="mx-auto flex max-w-[1160px] flex-col gap-7.5 @min-[1700px]/app:max-w-[1380px]">
      {/* Page head */}
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="shrink grow basis-130">
          <div className="mb-1 text-[14px] font-semibold text-muted-foreground">{projectName}</div>
          <h1 className="text-[40px] leading-[1.08] font-bold tracking-[-0.012em] text-balance">
            {pending.length ? (m.overview_screen__need_look({ count: pending.length })) : m.overview_screen__nothing_needs_you()}
          </h1>
          <p className="mt-1.5 max-w-ch62 text-[17px] text-ink-2 text-pretty">
            {pending.length ? pending[0].title : m.overview_screen__has_things({ name: projectName, count: counts.functions ?? 0 })}
          </p>
        </div>
        <PinButton />
      </div>

      {/* What to do next */}
      <section data-testid="next-card" data-hue="teal" className="relative grid grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] overflow-hidden rounded-next bg-hero text-hero-ink" aria-label={m.overview_screen__what_next()}>
        <div className="relative z-1 flex flex-col justify-center gap-3.5 px-10 pt-8.5 pb-9">
          {pending.length ? (
            <>
              <h2 className="max-w-ch20 text-[36px] leading-[1.1] tracking-[-0.02em] text-hero-ink font-bold text-balance">{pending[0].title}</h2>
              <p className="max-w-ch54 text-[17.5px] leading-[1.5] text-hero-ink-2 text-pretty">{pending[0].body ?? m.overview_screen__look_into_it()}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3.5">
                <Button variant="hero" size="pageLg" type="button" onClick={() => say(m.overview_screen__look_say({ title: pending[0].title }))}>
                  <MessageCircle className="size-4.5" />
                  {m.overview_screen__ask_about_it()}
                </Button>
                <Button variant="heroGhost" size="pageLg" type="button" onClick={() => open('updates')}>
                  
                  {m.overview_screen__see_all_updates()}
                </Button>
                <Button asChild variant="heroGhost" size="pageLg">
                  <Link {...keep} to="/design">
                    <ChevronRight className="rtl:-scale-x-100 size-4.5" />
                    {m.overview_screen__open_your_app()}
                  </Link>
                </Button>
                <Button variant="heroGhost" size="pageLg" type="button" onClick={check} disabled={checking} aria-busy={checking}>
                  {checking ? (
                    <i className="size-4.5 animate-[spin_0.8s_linear_infinite] rounded-full border-[2.5px] border-current border-e-transparent" />
                  ) : (
                    <RotateCw className="size-4.5" />
                  )}
                  {m.overview_screen__check_again()}
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="max-w-ch20 text-[36px] leading-[1.1] tracking-[-0.02em] text-hero-ink font-bold text-balance">{m.overview_screen__tell_title()}</h2>
              <p className="max-w-ch54 text-[17.5px] leading-[1.5] text-hero-ink-2 text-pretty">
                {m.overview_screen__tell_text()}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3.5">
                <Button variant="hero" size="pageLg" type="button" onClick={() => open('chat')}>
                  
                  {m.overview_screen__describe_what_you_want()}
                </Button>
                <Button asChild variant="heroGhost" size="pageLg">
                  <Link {...keep} to="/design">
                    <ChevronRight className="rtl:-scale-x-100 size-4.5" />
                    {m.overview_screen__open_your_app()}
                  </Link>
                </Button>
                <Button variant="heroGhost" size="pageLg" type="button" onClick={check} disabled={checking} aria-busy={checking}>
                  {checking ? (
                    <i className="size-4.5 animate-[spin_0.8s_linear_infinite] rounded-full border-[2.5px] border-current border-e-transparent" />
                  ) : (
                    <RotateCw className="size-4.5" />
                  )}
                  {m.overview_screen__check_again()}
                </Button>
              </div>
            </>
          )}
          <StatusLine status={checked} />
        </div>
        <div className="relative min-h-88">
          <BlobStage step={checking ? 'checking' : pending.length ? 'question' : 'choosing'} size={420} />
        </div>
      </section>

      {/* How it is going */}
      <section data-testid="health-row" className="flex flex-col gap-3.5" aria-label={m.overview_screen__how_going()}>
        <h2 className="text-[24px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">{m.overview_screen__how_going_title()}</h2>
        <div className="rounded-card border border-border bg-card shadow-card">
          {pending.map((c) => (
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-b border-border px-6 py-4.5 last:border-b-0">
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
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-b border-border px-6 py-4.5 last:border-b-0">
                  <span className={`mx-1 size-3 shrink-0 rounded-full ring-4 ${dot.ok}`} />
                  <div>
                    <b className="block text-[17px] leading-[1.3]">{m.overview_screen__things_can_do({ count: counts.functions ?? 0 })}</b>
                    <p className="text-[15px] text-ink-2 text-pretty">{m.overview_screen__counts_line({ agents: m.overview_screen__n_assistants({ count: counts.agents ?? 0 }), workflows: m.overview_screen__n_workflows({ count: counts.workflows ?? 0 }), emails: m.overview_screen__n_emails({ count: counts.emails ?? 0 }) })}</p>
                  </div>
                  <span />
                </div>
        </div>
      </section>

      {/* New here? */}
      {introHidden ? (
        <div>
          <button
            type="button"
            onClick={() => setIntroHidden(false)}
            className="inline-flex items-center gap-1.5 rounded-sm px-1 py-1.5 text-[14.5px] font-bold text-ink-2 underline-offset-3 hover:underline"
          >
            <Info className="size-4" strokeWidth={2.5} />
            {m.overview_screen__show_intro_again()}
          </button>
        </div>
      ) : (
        <section
          className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-center gap-7 rounded-card border border-border bg-card px-7 py-6.5 shadow-card group-data-open/shell:grid-cols-1"
          aria-label={m.overview_screen__new_here()}
        >
          <div>
            <h3 className="mb-1.5 text-[22px] font-bold tracking-[-0.012em] text-balance">{m.overview_screen__new_here_title()}</h3>
            <p className="text-ink-2 text-pretty">{m.overview_screen__intro_close()}</p>
            <div className="mt-3 flex gap-2">
              <Button variant="bordered" size="compact" type="button" onClick={() => setIntroHidden(true)}>
                
                {m.overview_screen__got_it_hide_this()}
              </Button>
            </div>
          </div>
          <ol className="grid grid-cols-3 gap-3.5 group-data-open/shell:grid-cols-1">
            <li className="flex flex-col gap-1.5 text-[15px] leading-[1.4] text-ink-2">
              <b className="flex items-center gap-2.5 text-[16px] text-foreground">
                <span className="grid size-6.5 shrink-0 place-items-center rounded-full bg-primary text-[14px] text-primary-foreground">{1}</span>
                {m.overview_screen__step1_title()}
              </b>
              {m.overview_screen__step1_text()}
            </li>
            <li className="flex flex-col gap-1.5 text-[15px] leading-[1.4] text-ink-2">
              <b className="flex items-center gap-2.5 text-[16px] text-foreground">
                <span className="grid size-6.5 shrink-0 place-items-center rounded-full bg-primary text-[14px] text-primary-foreground">{2}</span>
                {m.overview_screen__step2_title()}
              </b>
              {m.overview_screen__step2_text()}
            </li>
            <li className="flex flex-col gap-1.5 text-[15px] leading-[1.4] text-ink-2">
              <b className="flex items-center gap-2.5 text-[16px] text-foreground">
                <span className="grid size-6.5 shrink-0 place-items-center rounded-full bg-primary text-[14px] text-primary-foreground">{3}</span>
                {m.overview_screen__step3_title()}
              </b>
              {m.overview_screen__step3_before()}
              <Link {...keep} to="/publish" className="inline-flex items-center gap-1.5 rounded-sm p-0 text-[14.5px] font-bold text-accent-foreground no-underline underline-offset-3 hover:underline">
                {m.overview_screen__step3_link()}
              </Link>
              {m.overview_screen__step3_after()}
            </li>
          </ol>
        </section>
      )}

      {/* What your app is made of */}
      <section className="flex flex-col gap-3.5" aria-label={m.overview_screen__made_of()}>
        <h2 className="text-[24px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">{m.overview_screen__made_of_title()}</h2>
        {!Object.values(counts).some(Boolean) ? (
          <EmptyState icon={Blocks} title={m.overview_screen__no_parts()} text={m.overview_screen__no_parts_text()} />
        ) : (
          <>
            <p className="-mt-2 text-[15px] text-muted-foreground text-pretty">
              {m.overview_screen__made_of_hint()}
            </p>
            <div className="grid grid-cols-2 rounded-card border border-border bg-card shadow-card group-data-open/shell:grid-cols-1">
              {[[m.front_doors__title(), '', m.overview_screen__front_doors_text(), '', doorCount] as const, ...areas().map(([title, countKey, detail, name]) => [title, countKey, detail, name, counts[countKey] ?? 0] as const)].map(([title, countKey, detail, name, count], i) => {
                const row = `grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3.5 border-b border-border px-5 py-3.5 text-start transition-colors duration-140 hover:bg-secondary active:bg-surface-3 ${i % 2 === 0 ? 'border-e group-data-open/shell:border-e-0' : ''}`
                const body = (
                  <>
                    <span>
                      <b className="block text-[16px]">{title}</b>
                      <small className="block text-[14px] leading-[1.4] text-muted-foreground">{detail}</small>
                    </span>
                    <span className="min-w-[2ch] text-end font-heading text-[26px] font-bold tabular-nums">{count}</span>
                    <ChevronRight className="rtl:-scale-x-100 size-4.5 text-muted-foreground" />
                  </>
                )
                return countKey === '' ? (
                  <Link key={title} {...keep} to="/front-doors" className={row}>
                    {body}
                  </Link>
                ) : (
                  <button
                    key={title}
                    type="button"
                    onClick={() =>
                      setAreaMsg({ kind: 'ok', text: m.overview_screen__area_msg({ name }) })
                    }
                    className={row}
                  >
                    {body}
                  </button>
                )
              })}
            </div>
            <StatusLine status={areaMsg} />
          </>
        )}
      </section>
    </div>
  )
}
