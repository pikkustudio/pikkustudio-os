import { PinButton } from '../blocks/PinButton'
import { EmptyState } from '../blocks/EmptyState'
import { Link } from '@tanstack/react-router'
import { useContext, useState } from 'react'
import { useProjectKey, useProjectName } from '../lib/project'
import { useProjectQuery } from '../lib/projectRpc'
import { Button } from '../ui/button'
import { Check, ChevronRight, CircleAlert, ExternalLink, Info, MessageCircle, RotateCw, Blocks } from 'lucide-react'
import { ShellCtx } from '../lib/shell'
import { keep } from '../lib/links'


const dot = { ok: 'bg-success ring-success-soft', warn: 'bg-warning ring-card', info: 'bg-info ring-info-soft' }

const areas: Array<[string, string, string, string]> = [
  ['Things the app can do', 'functions', 'Each one is a small job, like booking a class or sending a receipt.', 'Functions'],
  ['Step-by-step jobs', 'workflows', 'Longer jobs that wait, check and carry on, like a booking from request to reminder.', 'Workflows'],
  ['Helpers', 'agents', 'AI helpers that answer visitors or tidy things up for you.', 'Assistants'],
  ['Web addresses', 'httpRoutes', 'The pages and links people open to use your app.', 'Web addresses'],
  ['Live connections', 'channels', 'Keep a page up to date while people watch, like the seats left in a class.', 'Live channels'],
  ['Tools for helpers', 'mcpTools', 'The things an AI helper is allowed to use.', 'Assistant tools'],
  ['Commands', 'cliCommands', 'Shortcuts that you or Pikku can type to look after the app.', 'Command-line commands'],
  ['Chat app links', 'gateways', 'Connect your app to a messaging app.', 'Gateways'],
  ['Timed jobs', 'schedulers', 'Things that run on their own, like a reminder every morning.', 'Schedules'],
  ['Waiting lines', 'queues', 'Jobs that queue up so nothing is lost when it gets busy.', 'Queues'],
  ['Emails', 'emails', 'The messages your app sends, like booking confirmations.', 'Emails'],
]

type Status = { kind: 'ok' | 'bad' | 'wait'; text: string } | undefined


function StatusLine({ status, onHero }: { status: Status; onHero?: boolean }) {
  if (!status) return null
  const tone = onHero ? 'text-hero-ink' : { ok: 'text-success-foreground', bad: 'text-destructive-foreground', wait: 'text-ink-2' }[status.kind]
  return (
    <span className={`inline-flex min-h-6 items-center gap-2 text-[14.5px] leading-[1.35] font-bold ${tone}`} role="status">
      {status.kind === 'ok' ? <Check className="size-4.5" strokeWidth={2.5} /> : null}
      {status.kind === 'bad' ? <CircleAlert className="size-4.5" strokeWidth={2.5} /> : null}
      {status.kind === 'wait' ? <i className="size-4 shrink-0 animate-[spin_0.8s_linear_infinite] rounded-full border-[2.5px] border-current border-r-transparent" /> : null}
      <span>{status.text}</span>
    </span>
  )
}

export function OverviewScreen() {
  const projectName = useProjectName()
  const counts = useProjectQuery<{ counts?: Record<string, number> }>(useProjectKey(), 'console:getAllMeta', {}).data?.counts ?? {}
  const { pending, say, open } = useContext(ShellCtx)
  const [checking, setChecking] = useState(false)
  const [checked, setChecked] = useState<Status>()
  const [introHidden, setIntroHidden] = useState(false)
  const [areaMsg, setAreaMsg] = useState<Status>()

  const check = () => {
    setChecking(true)
    setChecked({ kind: 'wait', text: 'Looking at your app again…' })
    window.setTimeout(() => {
      setChecking(false)
      setChecked({
        kind: 'ok',
        text: pending.length ? `Checked just now. ${pending.length} waiting for you.` : 'Checked just now. Nothing needs you.',
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
            {pending.length ? (pending.length === 1 ? 'One thing needs a look.' : `${pending.length} things need a look.`) : 'Nothing needs you right now.'}
          </h1>
          <p className="mt-1.5 max-w-ch62 text-[17px] text-ink-2 text-pretty">
            {pending.length ? pending[0].title : `${projectName} has ${counts.functions ?? 0} things it can do. Tell Pikku what you want next.`}
          </p>
        </div>
        <PinButton />
      </div>

      {/* What to do next */}
      <section data-hue="teal" className="relative grid grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] overflow-hidden rounded-next bg-hero text-hero-ink" aria-label="What to do next">
        <div className="relative z-1 flex flex-col justify-center gap-3.5 px-10 pt-8.5 pb-9">
          {pending.length ? (
            <>
              <h2 className="max-w-ch20 text-[36px] leading-[1.1] tracking-[-0.02em] text-hero-ink font-bold text-balance">{pending[0].title}</h2>
              <p className="max-w-ch54 text-[17.5px] leading-[1.5] text-hero-ink-2 text-pretty">{pending[0].body ?? 'Pikku can look into this and tell you what it changes before anything is built.'}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3.5">
                <Button variant="hero" size="pageLg" type="button" onClick={() => say(`Please look at this change request: ${pending[0].title}`)}>
                  <MessageCircle className="size-4.5" />
                  Ask Pikku about it
                </Button>
                <Button variant="heroGhost" size="pageLg" type="button" onClick={() => open('updates')}>
                  See all updates
                </Button>
                <Button asChild variant="heroGhost" size="pageLg">
                  <a href="/prototype" target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4.5" />
                    Open your app
                  </a>
                </Button>
                <Button variant="heroGhost" size="pageLg" type="button" onClick={check} disabled={checking} aria-busy={checking}>
                  {checking ? (
                    <i className="size-4.5 animate-[spin_0.8s_linear_infinite] rounded-full border-[2.5px] border-current border-r-transparent" />
                  ) : (
                    <RotateCw className="size-4.5" />
                  )}
                  Check again
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="max-w-ch20 text-[36px] leading-[1.1] tracking-[-0.02em] text-hero-ink font-bold text-balance">Tell Pikku what you want to make</h2>
              <p className="max-w-ch54 text-[17.5px] leading-[1.5] text-hero-ink-2 text-pretty">
                Describe it the way you would to a friend. Pikku will ask before it builds anything big. Nothing goes online until you say so.
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-3.5">
                <Button variant="hero" size="pageLg" type="button" onClick={() => open('chat')}>
                  Describe what you want
                </Button>
                <Button asChild variant="heroGhost" size="pageLg">
                  <a href="/prototype" target="_blank" rel="noreferrer">
                    <ExternalLink className="size-4.5" />
                    Open your app
                  </a>
                </Button>
                <Button variant="heroGhost" size="pageLg" type="button" onClick={check} disabled={checking} aria-busy={checking}>
                  {checking ? (
                    <i className="size-4.5 animate-[spin_0.8s_linear_infinite] rounded-full border-[2.5px] border-current border-r-transparent" />
                  ) : (
                    <RotateCw className="size-4.5" />
                  )}
                  Check again
                </Button>
              </div>
            </>
          )}
          <StatusLine status={checked} />
        </div>
        <div className="relative min-h-42.5">
          <svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden="true">
            <circle cx="230" cy="40" r="120" className="fill-w1" />
            <circle cx="70" cy="190" r="110" className="fill-w2" />
            <circle cx="170" cy="120" r="64" className="fill-w3" />
            <circle cx="262" cy="150" r="9" className="fill-coral" />
            <circle cx="40" cy="40" r="26" fill="none" className="stroke-w5" strokeWidth="3" strokeDasharray="3 9" strokeLinecap="round" />
          </svg>
        </div>
      </section>

      {/* How it is going */}
      <section className="flex flex-col gap-3.5" aria-label="How it is going">
        <h2 className="text-[24px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">How it is going</h2>
        <div className="rounded-card border border-border bg-card shadow-card">
          {pending.map((c) => (
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-b border-border px-6 py-4.5 last:border-b-0">
                  <span className={`mx-1 size-3 shrink-0 rounded-full ring-4 ${dot.warn}`} />
                  <div>
                    <b className="block text-[17px] leading-[1.3]">{c.title}</b>
                    <p className="text-[15px] text-ink-2 text-pretty">{c.body ?? 'Waiting for you.'}</p>
                  </div>
                  <Button variant="quiet" size="link" type="button" onClick={() => open('updates')}>
                    See updates
                    <ChevronRight className="size-4" strokeWidth={2.5} />
                  </Button>
                </div>
          ))}
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-b border-border px-6 py-4.5 last:border-b-0">
                  <span className={`mx-1 size-3 shrink-0 rounded-full ring-4 ${dot.ok}`} />
                  <div>
                    <b className="block text-[17px] leading-[1.3]">{`${counts.functions ?? 0} things your app can do`}</b>
                    <p className="text-[15px] text-ink-2 text-pretty">{`${counts.agents ?? 0} assistants, ${counts.workflows ?? 0} step-by-step jobs and ${counts.emails ?? 0} emails.`}</p>
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
            Show the introduction again
          </button>
        </div>
      ) : (
        <section
          className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-center gap-7 rounded-card border border-border bg-card px-7 py-6.5 shadow-card group-data-open/shell:grid-cols-1"
          aria-label="New here? Three steps."
        >
          <div>
            <h3 className="mb-1.5 text-[22px] font-bold tracking-[-0.012em] text-balance">New here? Three steps.</h3>
            <p className="text-ink-2 text-pretty">This is the whole idea. You can close this once it makes sense.</p>
            <div className="mt-3 flex gap-2">
              <Button variant="bordered" size="compact" type="button" onClick={() => setIntroHidden(true)}>
                Got it, hide this
              </Button>
            </div>
          </div>
          <ol className="grid grid-cols-3 gap-3.5 group-data-open/shell:grid-cols-1">
            <li className="flex flex-col gap-1.5 text-[15px] leading-[1.4] text-ink-2">
              <b className="flex items-center gap-2.5 text-[16px] text-foreground">
                <span className="grid size-6.5 shrink-0 place-items-center rounded-full bg-primary text-[14px] text-primary-foreground">1</span>
                Tell Pikku
              </b>
              Say what you want in your own words. Rough is fine.
            </li>
            <li className="flex flex-col gap-1.5 text-[15px] leading-[1.4] text-ink-2">
              <b className="flex items-center gap-2.5 text-[16px] text-foreground">
                <span className="grid size-6.5 shrink-0 place-items-center rounded-full bg-primary text-[14px] text-primary-foreground">2</span>
                Watch it get built
              </b>
              Pikku works step by step and tells you what it is doing as it goes.
            </li>
            <li className="flex flex-col gap-1.5 text-[15px] leading-[1.4] text-ink-2">
              <b className="flex items-center gap-2.5 text-[16px] text-foreground">
                <span className="grid size-6.5 shrink-0 place-items-center rounded-full bg-primary text-[14px] text-primary-foreground">3</span>
                Put it online
              </b>
              When you are happy,
              <Link {...keep} to="/publish" className="inline-flex items-center gap-1.5 rounded-sm p-0 text-[14.5px] font-bold text-accent-foreground no-underline underline-offset-3 hover:underline">
                publish
              </Link>
              so other people can use it.
            </li>
          </ol>
        </section>
      )}

      {/* What your app is made of */}
      <section className="flex flex-col gap-3.5" aria-label="What your app is made of">
        <h2 className="text-[24px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">What your app is made of</h2>
        {!Object.values(counts).some(Boolean) ? (
          <EmptyState icon={Blocks} title="No parts yet." text="Once Pikku starts building, you will see how many pages, emails, timed jobs and more your app has, and you can open each list." />
        ) : (
          <>
            <p className="-mt-2 text-[15px] text-muted-foreground text-pretty">
              You do not need these to run your app. They are here if you are curious, and each one opens its own list.
            </p>
            <div className="grid grid-cols-2 rounded-card border border-border bg-card shadow-card group-data-open/shell:grid-cols-1">
              {areas.map(([title, countKey, detail, name], i) => { const count = counts[countKey] ?? 0; return (
                <button
                  key={title}
                  type="button"
                  onClick={() =>
                    setAreaMsg({ kind: 'ok', text: `“${name}” has its own list in the full console. It is not part of this mock yet.` })
                  }
                  className={`grid w-full grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3.5 border-b border-border px-5 py-3.5 text-left transition-colors duration-140 hover:bg-secondary active:bg-surface-3 ${i % 2 === 0 ? 'border-r group-data-open/shell:border-r-0' : ''}`}
                >
                  <span>
                    <b className="block text-[16px]">{title}</b>
                    <small className="block text-[14px] leading-[1.4] text-muted-foreground">{detail}</small>
                  </span>
                  <span className="min-w-[2ch] text-right font-heading text-[26px] font-bold tabular-nums">{count}</span>
                  <ChevronRight className="size-4.5 text-muted-foreground" />
                </button>
              ) })}
            </div>
            <StatusLine status={areaMsg} />
          </>
        )}
      </section>
    </div>
  )
}
