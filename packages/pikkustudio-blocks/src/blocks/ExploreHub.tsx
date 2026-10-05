import { m } from '@/i18n/messages'
import { useContext } from 'react'
import { Link } from '@tanstack/react-router'
import { useProjectName } from '../lib/project'
import { Bot, ChevronRight, Clock, Database, HeartPulse, KeyRound, Plug, ScrollText, Search, Wallet, type LucideIcon } from 'lucide-react'
import { Button } from '../ui/button'
import { ShellCtx } from '../lib/shell'
import { keep } from '../lib/links'
import { Page } from './Page'
import { NextCard } from './NextCard'
import { PageHead } from './PageHead'
import { Section } from './Section'
import { questions } from './exploreSample'

const icons: Record<string, LucideIcon> = { away: ScrollText, secrets: KeyRound, cost: Wallet, who: KeyRound, own: Clock, mem: Database, well: HeartPulse, ai: Bot, plug: Plug }

export function Art() {
  return (
    <>
      <circle cx="220" cy="30" r="120" className="fill-w1" />
      <circle cx="60" cy="200" r="100" className="fill-w2" />
      <circle cx="180" cy="130" r="58" className="fill-w3" />
      <circle cx="268" cy="160" r="9" className="fill-coral" />
    </>
  )
}

const cls = 'flex w-full items-center gap-4 px-5 py-4 text-left no-underline transition-colors duration-140 hover:bg-secondary'
const pages: Record<string, string> = { away: '/logs', secrets: '/secrets' }

function Row({ q }: { q: (typeof questions)[number] }) {
  const { say } = useContext(ShellCtx)
  const Icon = icons[q.id]
  const inner = (
    <>
      <span data-hue={q.hue} className="grid size-11 shrink-0 place-items-center rounded-xl bg-hero text-hero-ink">
        <Icon className="size-5.5" />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block text-[17px] leading-[1.3] text-foreground">{q.q}</b>
        <small className="block text-[14px] text-ink-2">{q.ask[0]}</small>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </>
  )
  return pages[q.id] ? (
    <Link {...keep} to={pages[q.id] as never} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={() => say(q.q)} className={cls}>
      {inner}
    </button>
  )
}

export function ExploreHub() {
  const projectName = useProjectName()
  const { openFind, say } = useContext(ShellCtx)

  return (
    <Page gap="snug">
      <PageHead crumb={projectName} title={m.explore_hub__explore()} text={m.explore_hub__nothing_here_you_have()} size="lead" />

      <button
        type="button"
        onClick={openFind}
        className="flex h-11.5 w-full max-w-xl items-center gap-2.5 rounded-full border border-input bg-card px-5.5 text-left text-px15 text-ink-2 transition-colors duration-140 hover:bg-secondary"
      >
        <Search className="size-4.5" />
        <span className="flex-1">{m.explore_hub__jump_to_a_page()}</span>
        <kbd className="rounded-md border border-border px-1.5 text-[12px]">{m.explore_hub__k()}</kbd>
      </button>
      <p className="-mt-3 text-[14px] text-muted-foreground">{m.explore_hub__press_k_from_any()}</p>

      <NextCard label={m.explore_hub__ask_pikku()} hue="sea" art={<Art />} title={m.explore_hub__not_sure_where_to()} why={m.explore_hub__ask_pikku_in_your()}>
        <div>
          <Button variant="hero" size="pageLg" onClick={() => say(m.explore_hub__what_should_i_look_at_today())}>
            
            {m.explore_hub__ask_pikku()}
          </Button>
        </div>
      </NextCard>

      <Section title={m.explore_hub__things_to_look_into()}>
        <div className="divide-y divide-border overflow-hidden rounded-[22px] border border-border bg-card">
          {questions.map((q) => (
            <Row key={q.id} q={q} />
          ))}
        </div>
      </Section>
    </Page>
  )
}
