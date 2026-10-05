import { m } from '@/i18n/messages'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Check, ExternalLink, Lock, Pause, Pencil, RotateCcw, Sparkles, TriangleAlert } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { keep } from '../lib/links'
import { ProjectActions } from './ProjectActions'
import { ProjectThumb, type ProjectLook } from './ProjectThumb'

export type ProjectState = 'running' | 'live' | 'sketch' | 'paused'

export type Project = {
  id: string
  slug?: string
  name: string
  summary: string
  look: ProjectLook
  state: ProjectState
  note?: string
  when?: string
  visitors?: number
}

export const chips = (): Record<ProjectState, { text: string; icon: typeof Check; variant: 'pillOk' | 'pillInfo' | 'pillMute' }> => ({
  running: { text: m.project_card__running_well(), icon: Check, variant: 'pillOk' },
  live: { text: m.project_card__live(), icon: Check, variant: 'pillOk' },
  sketch: { text: m.project_card__in_the_sketch_stage(), icon: Sparkles, variant: 'pillInfo' },
  paused: { text: m.project_card__paused(), icon: Pause, variant: 'pillMute' },
})

export function ProjectCard({ item, onRestore }: { item: Project; onRestore: () => void }) {
  const chip = chips()[item.state]
  const Icon = chip.icon
  return (
    <article data-testid={`project_card__${item.id}`} className="flex flex-col overflow-hidden rounded-card border border-border bg-card shadow-card" aria-label={item.name}>
      <div className="aspect-[2/1] overflow-hidden border-b border-border bg-secondary">
        <ProjectThumb look={item.look} label={item.name} />
      </div>
      <div className="flex flex-1 flex-col gap-2.5 px-4.5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={chip.variant}>
            <Icon strokeWidth={2.5} />
            {chip.text}
          </Badge>
          {item.note ? (
            <Badge variant="warn">
              <TriangleAlert strokeWidth={2.5} />
              {item.note}
            </Badge>
          ) : null}
        </div>
        <b className="text-[19px] leading-[1.25]">{item.name}</b>
        <span className="text-ink-2 text-pretty">{item.summary}</span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-muted-foreground">
          {item.when ? <span>{m.project_card__last_worked_on({ when: item.when })}</span> : null}
          {item.state === 'running' ? (
            <span className="inline-flex items-center gap-1">
              <Lock className="size-3.5" strokeWidth={2.5} />
              
              {m.project_card__only_you_can_see()}
            </span>
          ) : null}
          {item.visitors ? <span>{m.project_card__visitors_this_week({ count: item.visitors })}</span> : null}
        </span>
        <ProjectActions item={item} onRestore={onRestore} className="mt-auto flex flex-wrap items-center gap-2 pt-2" />
      </div>
    </article>
  )
}
