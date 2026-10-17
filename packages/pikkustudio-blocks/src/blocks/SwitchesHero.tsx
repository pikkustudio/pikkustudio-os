import { m } from '@/i18n/messages'
import { ArrowRight } from 'lucide-react'
import { Button } from '../ui/button'
import { NextCard } from './NextCard'
import { PikkuDot } from './PikkuDot'

function Art() {
  return (
    <>
      <circle cx="230" cy="40" r="120" className="fill-w1" />
      <circle cx="50" cy="190" r="100" className="fill-w2" />
      <circle cx="170" cy="130" r="58" className="fill-w3" />
      <circle cx="270" cy="165" r="9" className="fill-coral" />
      <rect x="120" y="112" width="100" height="44" rx="22" className="fill-w6" opacity="0.92" />
      <circle cx="198" cy="134" r="16" className="fill-w2" />
    </>
  )
}

export function SwitchesHero({
  total,
  on,
  attention,
  writable,
  problem,
  onLook,
  onAsk,
  onFix,
}: {
  total: number | undefined
  on: number
  attention: number
  writable: boolean
  problem?: 'not-running' | 'no-addon' | 'forbidden' | 'other' | null
  onLook: () => void
  onAsk: () => void
  onFix?: () => void
}) {
  if (problem) {
    return (
      <NextCard
        label={m.switches_hero__label()}
        hue="teal"
        art={<Art />}
        title={problem === 'not-running' ? m.switches_screen__not_running_title() : problem === 'forbidden' ? m.switches_screen__cannot_see() : problem === 'no-addon' ? m.switches_screen__no_addon_title() : m.switches_hero__error_title()}
        why={problem === 'not-running' ? m.switches_screen__not_running_text() : problem === 'forbidden' ? m.switches_screen__cannot_see_text() : problem === 'no-addon' ? m.switches_screen__no_addon_text() : m.switches_hero__error_text()}
      >
        {onFix ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <Button variant="hero" size="pageLg" type="button" onClick={onFix}>
              <PikkuDot />
              {problem === 'forbidden' ? m.switches_screen__cannot_see_ask() : m.switches_hero__fix()}
            </Button>
          </div>
        ) : null}
      </NextCard>
    )
  }
  if (total === undefined) {
    return <NextCard label={m.switches_hero__label()} hue="teal" art={<Art />} title={m.switches_hero__loading()} why={m.switches_screen__text()} />
  }
  if (total === 0) {
    return (
      <NextCard label={m.switches_hero__label()} hue="teal" art={<Art />} title={m.switches_hero__empty_title()} why={m.switches_hero__empty_text()}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Button variant="hero" size="pageLg" type="button" onClick={onAsk}>
            <PikkuDot />
            {m.switches_hero__ask()}
          </Button>
        </div>
      </NextCard>
    )
  }
  if (attention > 0) {
    return (
      <NextCard label={m.switches_hero__label()} hue="teal" art={<Art />} title={m.switches_hero__attention_title({ count: attention })} why={m.switches_hero__attention_text()}>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <Button variant="hero" size="pageLg" type="button" onClick={onLook}>
            {m.switches_hero__look()}
            <ArrowRight className="size-4.5" />
          </Button>
        </div>
      </NextCard>
    )
  }
  return (
    <NextCard label={m.switches_hero__label()} hue="teal" art={<Art />} title={m.switches_hero__title()} why={writable ? m.switches_hero__text() : m.switches_hero__read_only()}>
      {total ? (
        <span className="inline-flex items-center gap-2.5 text-px16 font-bold">
          <span className="size-3 shrink-0 rounded-full bg-success ring-4 ring-hero-ink/20" />
          {m.switches_hero__count({ on, total })}
        </span>
      ) : null}
    </NextCard>
  )
}
