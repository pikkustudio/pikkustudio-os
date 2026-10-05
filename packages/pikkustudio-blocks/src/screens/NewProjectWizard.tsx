import { useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Bot, Check, Globe, Monitor, Plug, Smartphone, Sparkles, Terminal, Users, UserRound, Workflow } from 'lucide-react'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import type { Uses } from './OnboardingLayout'

type Option = { id: string; name: string; text: string; icon: ReactNode; soon?: boolean }

const AUDIENCE: Option[] = [
  { id: 'others', name: 'For other people', text: 'Customers, members or a team. For example a booking page for my baking classes.', icon: <Users /> },
  { id: 'me', name: 'For me, in my Studio', text: 'Something that works for you. For example the 5 most critical emails to answer, every day.', icon: <UserRound />, soon: true },
]

const SURFACES: Option[] = [
  { id: 'screens', name: 'A website or app', text: 'People open it and click around. Customers book a table.', icon: <Globe /> },
  { id: 'automations', name: 'Things on their own', text: 'When an order comes in, email the kitchen.', icon: <Workflow />, soon: true },
  { id: 'assistant', name: 'An assistant', text: 'People ask it things, like stock levels.', icon: <Bot />, soon: true },
  { id: 'commands', name: 'Commands', text: 'A tool my team runs in a terminal to export the report.', icon: <Terminal />, soon: true },
  { id: 'connection', name: 'A connection', text: 'Let our accounting tool read our orders.', icon: <Plug />, soon: true },
]

const DEVICES: Option[] = [
  { id: 'browser', name: 'In a web browser', text: 'On a computer, and it works in a phone’s browser too.', icon: <Monitor /> },
  { id: 'phones', name: 'On iPhone and Android', text: 'An app installed from the app stores. Takes noticeably longer to build and publish.', icon: <Smartphone /> },
]

const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id])

function Card({ o, on, role, onClick }: { o: Option; on: boolean; role: 'radio' | 'checkbox'; onClick: () => void }) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={on}
      onClick={onClick}
      className={`group relative flex flex-col items-start gap-3 rounded-[22px] border-2 p-5 text-left transition ${on ? 'border-hero-ink bg-hero-ink/12 shadow-lift' : 'border-hero-ink/25 hover:border-hero-ink/60 hover:bg-hero-ink/6'}`}
    >
      <span className={`grid size-12 place-items-center rounded-2xl [&>svg]:size-6 ${on ? 'bg-hero-ink text-hero' : 'bg-hero-ink/12'}`}>{o.icon}</span>
      <span className="flex flex-col gap-1">
        <b className="text-[18px] leading-tight">{o.name}</b>
        <span className="text-[14.5px] leading-snug text-hero-ink-2 text-pretty">{o.text}</span>
      </span>
      {o.soon ? <span className="absolute top-4 right-4 rounded-full border border-hero-ink/40 px-2.5 py-0.5 text-[12px] font-semibold">Coming soon</span> : null}
      {on ? (
        <span className="absolute right-4 bottom-4 grid size-6 place-items-center rounded-full bg-hero-ink text-hero">
          <Check className="size-4" strokeWidth={3} />
        </span>
      ) : null}
    </button>
  )
}

const h1 = 'max-w-[18ch] text-[44px] leading-[1.06] tracking-[-0.02em] group-data-open/shell:text-[38px] @min-[1700px]/app:text-[54px] font-bold text-balance'
const lead = 'mt-3 max-w-[52ch] text-[18px] leading-[1.5] text-hero-ink-2 text-pretty'

export function NewProjectWizard({
  idea,
  setIdea,
  uses,
  setUses,
  touch,
  taken,
  ready,
  go,
  aside,
}: {
  idea: string
  setIdea: (v: string) => void
  uses: Uses
  setUses: (v: Uses) => void
  touch: () => void
  taken?: string
  ready: boolean
  go: () => void
  aside?: ReactNode
}) {
  const [at, setAt] = useState(0)
  const steps = ['idea', 'audience', ...(uses.audience === 'others' ? ['surfaces'] : []), ...(uses.audience === 'others' && uses.surfaces.includes('screens') ? ['devices'] : [])]
  const step = steps[Math.min(at, steps.length - 1)]!
  const last = at >= steps.length - 1
  const ideaOk = idea.trim().length >= 8 && !taken
  const can = step === 'idea' ? ideaOk : step === 'audience' ? uses.audience === 'others' : step === 'surfaces' ? uses.surfaces.includes('screens') : uses.devices.length > 0
  const next = () => (last ? go() : setAt(at + 1))
  const copy: Record<string, [string, string]> = {
    idea: ['Say what you want to build.', 'A rough sentence is enough. You will see a first draft in a few minutes, and nothing goes online until you say so.'],
    audience: ['Who is it for?', 'This decides what I set up for you.'],
    surfaces: ['How will people use it?', 'Choose everything that applies. You can add more later.'],
    devices: ['Where will people use it?', 'Most projects start in the browser and add the phone apps later.'],
  }
  return (
    <div className="flex max-w-[640px] flex-col gap-6">
      <ol className="flex items-center gap-2" aria-label={`Step ${at + 1} of ${steps.length}`}>
        {steps.map((s, i) => (
          <li key={s} className={`h-1.5 rounded-full transition-all ${i === at ? 'w-9 bg-hero-ink' : i < at ? 'w-6 bg-hero-ink/70' : 'w-6 bg-hero-ink/25'}`} />
        ))}
        <span className="ml-2 text-[14px] font-semibold text-hero-ink-2">
          Step {at + 1} of {steps.length}
        </span>
      </ol>
      <div>
        <h1 className={h1}>{copy[step]![0]}</h1>
        <p className={lead}>{copy[step]![1]}</p>
      </div>
      {aside}
      {step === 'idea' ? (
        <>
          <label className="sr-only" htmlFor="idea">
            What do you want to build?
          </label>
          <Textarea id="idea" tone="hero" value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="For example: a booking page for my baking classes, where people can pick a day and pay." />
          {taken ? <p className="text-[15px] text-hero-ink-2">You already have a project called {taken}. Change the first few words.</p> : null}
        </>
      ) : null}
      {step === 'audience' ? (
        <div role="radiogroup" className="grid gap-3.5 @min-[900px]/app:grid-cols-2">
          {AUDIENCE.map((o) => (
            <Card key={o.id} o={o} role="radio" on={uses.audience === o.id} onClick={() => { touch(); setUses({ ...uses, audience: o.id as Uses['audience'] }) }} />
          ))}
        </div>
      ) : null}
      {step === 'surfaces' ? (
        <div className="grid gap-3.5 @min-[900px]/app:grid-cols-2">
          {SURFACES.map((o) => (
            <Card key={o.id} o={o} role="checkbox" on={uses.surfaces.includes(o.id)} onClick={() => setUses({ ...uses, surfaces: toggle(uses.surfaces, o.id) })} />
          ))}
        </div>
      ) : null}
      {step === 'devices' ? (
        <div className="grid gap-3.5 @min-[900px]/app:grid-cols-2">
          {DEVICES.map((o) => (
            <Card key={o.id} o={o} role="checkbox" on={uses.devices.includes(o.id)} onClick={() => setUses({ ...uses, devices: toggle(uses.devices, o.id) })} />
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        {at > 0 ? (
          <Button variant="heroGhost" size="pageLg" type="button" onClick={() => setAt(at - 1)}>
            <ArrowLeft className="size-5.5" />
            <span>Back</span>
          </Button>
        ) : null}
        <Button variant="hero" size="pageLg" type="button" disabled={!can || (last && !ready)} onClick={next}>
          {last ? <Sparkles className="size-5.5" /> : null}
          <span>{last ? 'Start building' : 'Continue'}</span>
          {last ? null : <ArrowRight className="size-5.5" />}
        </Button>
        {step === 'audience' && uses.audience === 'me' ? <span className="text-[15px] text-hero-ink-2">Things just for you are coming soon. For now I can build something for other people.</span> : null}
        {step === 'surfaces' && !uses.surfaces.includes('screens') ? <span className="text-[15px] text-hero-ink-2">For now I can only start with a website or app.</span> : null}
      </div>
    </div>
  )
}
