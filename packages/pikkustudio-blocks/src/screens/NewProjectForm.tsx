import { useState, type ReactNode } from 'react'
import { ArrowRight, Check, Monitor, Smartphone, Sparkles, UserRound } from 'lucide-react'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import type { Uses } from './OnboardingLayout'

const PLATFORMS = [
  { id: 'browser', name: 'Browser', icon: <Monitor className="size-4.5" /> },
  { id: 'phones', name: 'Mobile', icon: <Smartphone className="size-4.5" /> },
]

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onClick}
      className={`flex h-11 items-center gap-2 rounded-full border-2 px-4 text-[15px] font-semibold transition ${on ? 'border-hero-ink bg-hero-ink text-hero' : 'border-hero-ink/35 hover:border-hero-ink/70'}`}
    >
      {on ? <Check className="size-4" strokeWidth={3} /> : null}
      {children}
    </button>
  )
}

export function NewProjectForm({
  idea,
  setIdea,
  uses,
  setUses,
  taken,
  ready,
  go,
}: {
  idea: string
  setIdea: (v: string) => void
  uses: Uses
  setUses: (v: Uses) => void
  taken?: string
  ready: boolean
  go: () => void
}) {
  const [mine, setMine] = useState('')
  const flip = (id: string) => setUses({ ...uses, devices: uses.devices.includes(id) ? uses.devices.filter((x) => x !== id) : [...uses.devices, id] })
  return (
    <div className="flex max-w-[680px] flex-col gap-4">
      <h1 className="max-w-[20ch] text-[44px] leading-[1.06] font-bold tracking-[-0.02em] text-balance group-data-open/shell:text-[38px] @min-[1700px]/app:text-[52px]">What do you want to make?</h1>
      <section aria-label="Build an app" className="flex flex-col gap-3.5">
        <label htmlFor="idea" className="text-[17px] font-bold">
          Build an app
        </label>
        <Textarea id="idea" tone="hero" value={idea} onChange={(e) => setIdea(e.target.value)} placeholder="For example: a booking page for my baking classes, where people can pick a day and pay." />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
          <div role="group" aria-label="Where people will use it" className="flex items-center gap-2">
            {PLATFORMS.map((p) => (
              <Pill key={p.id} on={uses.devices.includes(p.id)} onClick={() => flip(p.id)}>
                {p.icon}
                {p.name}
              </Pill>
            ))}
          </div>
          <Button variant="hero" size="pageLg" type="button" disabled={!ready} onClick={go} className="ml-auto">
            <Sparkles className="size-5.5" />
            <span>Start building</span>
            <ArrowRight className="size-5.5" />
          </Button>
        </div>
        <p className="min-h-5 text-[14.5px] text-hero-ink-2">
          {taken
            ? `You already have a project called ${taken}. Change the first few words.`
            : uses.devices.length === 0
              ? 'Pick at least one: browser, mobile, or both.'
              : uses.devices.includes('phones')
                ? 'Mobile means iPhone and Android. It takes noticeably longer to build and publish, so many people start with the browser.'
                : 'Nothing goes online until you say so.'}
        </p>
      </section>
      <section aria-label="For me, in my Studio" className="flex flex-col gap-3 rounded-[22px] border border-hero-ink/30 bg-hero-ink/8 p-4">
        <div className="flex items-center gap-2 text-[16px] font-bold">
          <UserRound className="size-5" />
          For me, in my Studio
          <span className="rounded-full border border-hero-ink/40 px-2.5 py-0.5 text-[12px] font-semibold">Coming soon</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            aria-label="Something just for me"
            value={mine}
            onChange={(e) => setMine(e.target.value)}
            placeholder="For example: every day, the 5 most critical emails I should answer"
            className="h-12 min-w-60 flex-1 rounded-full border border-hero-ink/30 bg-transparent px-5 text-[15px] placeholder:text-hero-ink-2 focus:border-hero-ink focus:outline-none"
          />
          <Button variant="heroGhost" size="page" type="button" disabled>
            Set it up
          </Button>
        </div>
      </section>
    </div>
  )
}
