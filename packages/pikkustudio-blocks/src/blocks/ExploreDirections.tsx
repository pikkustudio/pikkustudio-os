import { useContext, useEffect, useRef, useState } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '../ui/button'
import { ShellCtx } from '../lib/shell'
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
    <button ref={box} type="button" aria-label={`Open ${d.title}`} onClick={() => onOpen(d.id)} className="relative block min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card text-left">
      <div style={{ width: SITE_WIDTH, height: `calc(100% / ${scale})`, transform: `scale(${scale})` }} className="pointer-events-none absolute top-0 left-0 origin-top-left">
        <ArtifactFrame html={d.html ?? ''} title={d.title} />
      </div>
    </button>
  )
}

export const moreIdeasMessage = (mode: 'controlled' | 'extreme', exploration: string) =>
  mode === 'controlled'
    ? `Explore a few more options as a new exploration, staying close to the current direction. Use Tailwind, and the project's design guide if it has one, and vary the details. Write each to artifacts/<id> with artifact.json including "exploration":"<a new short id>","mode":"controlled", and add them one at a time. Earlier exploration: ${exploration}.`
    : `Explore a few completely different directions as a new exploration, ignoring the design system. Self-contained HTML with inline CSS and no scripts. Write each to artifacts/<id> with artifact.json including "exploration":"<a new short id>","mode":"extreme", and add them one at a time. Earlier exploration: ${exploration}.`

export const chooseMessage = (title: string) => `Use the direction "${title}" and build the prototype app from it, as its own app next to the real app.`

export function ExploreDirections({ directions, onOpen }: { directions: Artifact[]; onOpen: (id: string) => void }) {
  const { say } = useContext(ShellCtx)
  return (
    <div className="flex min-h-0 flex-1 snap-x snap-mandatory gap-3.5 overflow-x-auto overflow-y-hidden pb-2">
      {directions.map((d, i) => (
        <section key={d.id} className="flex min-w-60 flex-1 snap-start flex-col gap-3 rounded-2xl bg-card p-3.5 shadow-lift">
          <header className="flex flex-col gap-0.5">
            <p className="m-0 text-px13 font-semibold text-muted-foreground">Idea {i + 1}</p>
            <h2 className="m-0 text-px20 font-bold">{d.title}</h2>
            <p className="m-0 text-px15 text-ink-2 text-pretty">{d.summary}</p>
          </header>
          <Shot d={d} onOpen={onOpen} />
          <div className="flex gap-2">
            <Button variant="bordered" size="compact" type="button" onClick={() => onOpen(d.id)}>
              Look closer <ArrowRight />
            </Button>
            <Button size="compact" type="button" onClick={() => say(chooseMessage(d.title))}>
              <Check /> Use this one
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
          <ArtifactFrame html={direction.html ?? ''} title={direction.title} />
        </div>
      </div>
    </div>
  )
}
