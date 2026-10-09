import type { I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext } from 'react'
import { Link } from './Link'
import { useProjectName } from '../lib/project'
import { AppWindow, Bot, ChevronRight, Clock, Database, FileText, HeartPulse, History, KeyRound, Languages, Layers, Plug, ScrollText, Search, Users, Wallet, type LucideIcon } from 'lucide-react'
import { Button } from '../ui/button'
import { ShellCtx } from '../lib/shell'
import { keep } from '../lib/links'
import { Page } from './Page'
import { NextCard } from './NextCard'
import { PageHead } from './PageHead'
import { Section } from './Section'
import { questions, type Question } from './exploreSample'
import { MOVABLE, usePins, type Movable } from '../lib/pins'

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
  return <HubRow hue={q.hue} Icon={icons[q.id]} title={q.q} text={q.ask[0]} to={pages[q.id]} onPick={() => say(q.q)} />
}

const movable: Record<Movable, { hue: Hue; Icon: LucideIcon; title: () => I18nString; text: () => I18nString }> = {
  'virtual-users': { hue: 'teal', Icon: Users, title: () => m.explore_hub__virtual_users_title(), text: () => m.explore_hub__virtual_users_text() },
  translations: { hue: 'sea', Icon: Languages, title: () => m.explore_hub__translations_title(), text: () => m.explore_hub__translations_text() },
  artifacts: { hue: 'petrol', Icon: Layers, title: () => m.explore_hub__artifacts_title(), text: () => m.explore_hub__artifacts_text() },
  content: { hue: 'teal', Icon: FileText, title: () => m.explore_hub__content_title(), text: () => m.explore_hub__content_text() },
  'front-doors': { hue: 'sea', Icon: AppWindow, title: () => m.explore_hub__front_doors_title(), text: () => m.explore_hub__front_doors_text() },
  audit: { hue: 'petrol', Icon: History, title: () => m.explore_hub__audit_title(), text: () => m.explore_hub__audit_text() },
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

      <NextCard label={m.explore_hub__ask_pikku()} hue="sea" art={<Art />} title={m.explore_hub__not_sure_where_to()} why={m.explore_hub__ask_pikku_in_your()}>
        <div>
          <Button variant="hero" size="pageLg" onClick={() => say(m.explore_hub__what_should_i_look_at_today())}>
            
            {m.explore_hub__ask_pikku()}
          </Button>
        </div>
      </NextCard>

      <Section title={m.explore_hub__more_of_your_project()}>
        <div className="divide-y divide-border overflow-hidden rounded-[22px] border border-border bg-card">
          {MOVABLE.map((id) => (
            <HubRow key={id} hue={movable[id].hue} Icon={movable[id].Icon} title={movable[id].title()} text={movable[id].text()} aside={pins.includes(id) ? m.explore_hub__on_your_sidebar() : undefined} to={`/${id}`} />
          ))}
        </div>
      </Section>

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
