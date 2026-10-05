import { useContext } from 'react'
import { ArrowRight, Check } from 'lucide-react'
import { Button } from '../ui/button'
import { ShellCtx } from '../lib/shell'
import { ArtifactFrame } from './ArtifactFrame'
import type { Artifact } from '../types/artifacts'

export const chooseMessage = (title: string) => `Use the direction "${title}" and build the prototype app from it, as its own app next to the real app.`

export function ExploreDirections({ directions, onOpen }: { directions: Artifact[]; onOpen: (id: string) => void }) {
  const { say } = useContext(ShellCtx)
  return (
    <div className="flex min-h-0 flex-1 items-start snap-x snap-mandatory gap-3.5 overflow-x-auto overflow-y-hidden pb-2">
      {directions.map((d, i) => (
        <section key={d.id} className="flex w-96 max-w-full shrink-0 snap-start flex-col gap-3 rounded-2xl bg-card p-3.5 shadow-lift">
          <header className="flex min-h-32 flex-col gap-0.5">
            <p className="m-0 text-px13 font-semibold text-muted-foreground">Idea {i + 1}</p>
            <h2 className="m-0 text-px20 font-bold">{d.title}</h2>
            <p className="m-0 text-px15 text-ink-2 text-pretty">{d.summary}</p>
          </header>
          <button type="button" aria-label={`Open ${d.title}`} onClick={() => onOpen(d.id)} className="relative block h-120 overflow-hidden rounded-xl border border-border bg-card text-left">
            <div className="pointer-events-none absolute top-0 left-0 h-406.75 w-300 origin-top-left scale-[0.295]">
              <ArtifactFrame html={d.html ?? ''} title={d.title} />
            </div>
          </button>
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
    <div className="relative flex min-h-0 items-start justify-center overflow-auto rounded-card bg-surface-3 p-4.5">
      <div className={`w-full self-start transition-[max-width] duration-420 ease-[cubic-bezier(.16,1,.3,1)] ${widths[device]}`}>
        <div key={`${direction.id}-${reloadKey}`} className="h-[70vh] overflow-hidden rounded-2xl shadow-lift">
          <ArtifactFrame html={direction.html ?? ''} title={direction.title} />
        </div>
      </div>
    </div>
  )
}
