import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '../ui/button'
import { useChooseDirection } from '../lib/useChooseDirection'
import { ArtifactFrame } from './ArtifactFrame'
import type { Artifact } from '../types/artifacts'

const SITE_WIDTH = 1200

function Shot({ d, onOpen }: { d: Artifact; onOpen: (id: string) => void }) {
  const box = useRef<HTMLButtonElement>(null)
  const [scale, setScale] = useState(0.3)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const watch = new ResizeObserver(() => setScale(el.clientWidth / SITE_WIDTH))
    watch.observe(el)
    return () => watch.disconnect()
  }, [])
  return (
    <button ref={box} type="button" aria-label={m.explore_directions__open({ title: d.title })} onClick={() => onOpen(d.id)} className="relative block min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card text-start">
      <div style={{ width: SITE_WIDTH, height: `calc(100% / ${scale})`, transform: `scale(${scale})` }} className="pointer-events-none absolute top-0 start-0 origin-top-left rtl:origin-top-right">
        <ArtifactFrame html={d.html ?? ''} title={asI18n(d.title)} />
      </div>
    </button>
  )
}

export const moreIdeasMessage = (mode: 'controlled' | 'extreme', exploration: string): I18nString =>
  mode === 'controlled' ? m.explore_directions__more_controlled({ exploration }) : m.explore_directions__more_extreme({ exploration })

export function ExploreDirections({ directions, onOpen }: { directions: Artifact[]; onOpen: (id: string) => void }) {
  const choose = useChooseDirection()
  return (
    <div className="flex min-h-0 flex-1 snap-x snap-mandatory gap-3.5 overflow-x-auto overflow-y-hidden pb-2">
      {directions.map((d, i) => (
        <section key={d.id} className="flex min-w-100 flex-1 snap-start flex-col gap-3 rounded-2xl bg-card p-3.5 shadow-lift">
          <header className="flex flex-col gap-0.5">
            <p className="m-0 text-px13 font-semibold text-muted-foreground">{m.explore_directions__idea({ n: i + 1 })}</p>
            <h2 className="m-0 text-px20 font-bold">{asI18n(d.title)}</h2>
            <p className="m-0 text-px15 text-ink-2 text-pretty">{asI18n(d.summary)}</p>
          </header>
          <Shot d={d} onOpen={onOpen} />
          <div className="flex gap-2">
            <Button variant="bordered" size="compact" type="button" onClick={() => onOpen(d.id)}>
              {m.explore_directions__look_closer()}<ArrowRight className="rtl:-scale-x-100" />
            </Button>
            <Button size="compact" type="button" onClick={() => choose(d)}>
              <Check />{m.explore_directions__use_this_one()}
            </Button>
          </div>
        </section>
      ))}
    </div>
  )
}

const widths = { computer: 'max-w-full', tablet: 'max-w-[768px]', phone: 'max-w-[390px]' } as const

export function ExploreDirection({ direction, device, reloadKey }: { direction: Artifact; device: keyof typeof widths; reloadKey: number }) {
  return (
    <div className="relative flex min-h-0 flex-1 items-start justify-center overflow-auto rounded-card bg-surface-3 p-4.5">
      <div className={`h-full w-full self-start transition-[max-width] duration-420 ease-[cubic-bezier(.16,1,.3,1)] ${widths[device]}`}>
        <div key={`${direction.id}-${reloadKey}`} className="h-full overflow-hidden rounded-2xl shadow-lift">
          <ArtifactFrame html={direction.html ?? ''} title={asI18n(direction.title)} />
        </div>
      </div>
    </div>
  )
}
