import type { I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext } from 'react'
import { Link } from './Link'
import { useProjectName } from '../lib/project'
import { Bot, ChevronRight, Clock, Database, HeartPulse, KeyRound, Plug, ScrollText, Search, Wallet, type LucideIcon } from 'lucide-react'
import { Button } from '../ui/button'
import { ShellCtx } from '../lib/shell'
import { keep } from '../lib/links'
import { Page } from './Page'
import { NextCard } from './NextCard'
import { PageHead } from './PageHead'
import { Section } from './Section'
import { questions, type Question } from './exploreSample'
import { usePins } from '../lib/pins'
import { isLocalOnly, registry } from '../lib/nav-registry'
import { msg, navIcon } from '../lib/nav-labels'

const icons: Record<string, LucideIcon> = { away: ScrollText, secrets: KeyRound, cost: Wallet, who: KeyRound, own: Clock, mem: Database, well: HeartPulse, ai: Bot, plug: Plug }

const cls = 'flex w-full items-center gap-4 px-5 py-4 text-start no-underline transition-colors duration-140 hover:bg-secondary'
const pages: Record<string, string> = { away: '/logs', secrets: '/secrets', well: '/performance' }

type Hue = 'teal' | 'petrol' | 'sea'

function HubRow({ hue, Icon, title, text, aside, to, onPick }: { hue: Hue; Icon: LucideIcon; title: I18nString; text: I18nString; aside?: I18nString; to?: string; onPick?: () => void }) {
  const inner = (
    <>
      <span data-hue={hue} className="grid size-11 shrink-0 place-items-center rounded-xl bg-hero text-hero-ink">
        <Icon className="size-5.5" />
      </span>
      <span className="min-w-0 flex-1">
        <b className="block text-[17px] leading-[1.3] text-foreground">{title}</b>
        <small className="block text-[14px] text-ink-2">{text}</small>
      </span>
      {aside ? <span className="shrink-0 text-[13px] text-muted-foreground">{aside}</span> : null}
      <ChevronRight className="rtl:-scale-x-100 size-5 shrink-0 text-muted-foreground" />
    </>
  )
  return to ? (
    <Link {...keep} to={to as never} className={cls}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onPick} className={cls}>
      {inner}
    </button>
  )
}

function Row({ q }: { q: Question }) {
  const { say } = useContext(ShellCtx)
  return <HubRow hue={q.hue} Icon={icons[q.id]} title={q.q} text={q.ask[0]} to={pages[q.id] && !isLocalOnly(pages[q.id]) ? pages[q.id] : undefined} onPick={() => say(q.q)} />
}

export function ExploreHub() {
  const projectName = useProjectName()
  const { openFind, say } = useContext(ShellCtx)
  const { pins } = usePins()

  return (
    <Page gap="snug">
      <PageHead crumb={projectName} title={m.explore_hub__explore()} text={m.explore_hub__nothing_here_you_have()} size="lead" />

      <button
        type="button"
        onClick={openFind}
        className="flex h-11.5 w-full max-w-xl items-center gap-2.5 rounded-full border border-input bg-card px-5.5 text-start text-px15 text-ink-2 transition-colors duration-140 hover:bg-secondary"
      >
        <Search className="size-4.5" />
        <span className="flex-1">{m.explore_hub__jump_to_a_page()}</span>
        <kbd className="rounded-md border border-border px-1.5 text-[12px]">{m.explore_hub__k()}</kbd>
      </button>
      <p className="-mt-3 text-[14px] text-muted-foreground">{m.explore_hub__press_k_from_any()}</p>

      <NextCard label={m.explore_hub__ask_pikku()} hue="sea" page="explore" title={m.explore_hub__not_sure_where_to()} why={m.explore_hub__ask_pikku_in_your()}>
        <div>
          <Button variant="hero" size="pageLg" onClick={() => say(m.explore_hub__what_should_i_look_at_today())}>
            
            {m.explore_hub__ask_pikku()}
          </Button>
        </div>
      </NextCard>

      {registry.explore.map((section) => (
        <Section key={section.title} title={msg(section.title)}>
          <div className="divide-y divide-border overflow-hidden rounded-[22px] border border-border bg-card">
            {section.rows.map((row) => (
              <HubRow key={row.path} hue={row.hue} Icon={navIcon(row.icon)} title={msg(row.title)} text={msg(row.text)} aside={pins.includes(row.path.slice(1)) ? m.explore_hub__on_your_sidebar() : undefined} to={row.path} />
            ))}
          </div>
        </Section>
      ))}

      <Section title={m.explore_hub__things_to_look_into()}>
        <div className="divide-y divide-border overflow-hidden rounded-[22px] border border-border bg-card">
          {questions().map((q) => (
            <Row key={q.id} q={q} />
          ))}
        </div>
      </Section>
    </Page>
  )
}
