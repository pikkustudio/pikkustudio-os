import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { Link } from './Link'
import { ArrowRight, Check, ExternalLink, Lock, Pause, Pencil, RotateCcw, Sparkles, TriangleAlert } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { keep } from '../lib/links'
import { ProjectActions } from './ProjectActions'
import { ProjectFacts } from './ProjectFacts'
import { ProjectThumb, type ProjectLook } from './ProjectThumb'

export type ProjectState = 'running' | 'progress' | 'live' | 'sketch' | 'paused'

export type Project = {
  id: string
  slug?: string
  name: string
  summary: string
  look: ProjectLook
  state: ProjectState
  note?: I18nString
  when?: string
  visitors?: number
  workspaces?: { local: number; cloud: number }
  live?: { places: number } | null
  attention?: number
  workingNow?: string[]
  usage?: I18nString
  image?: string | null
  repoUrl?: string | null
  favourite?: boolean
  visitedAt?: string
}

export const chips = (): Record<ProjectState, { text: I18nString; icon: typeof Check; variant: 'pillOk' | 'pillInfo' | 'pillMute' }> => ({
  running: { text: m.project_card__running_well(), icon: Check, variant: 'pillOk' },
  progress: { text: m.project_card__pikku_working(), icon: Sparkles, variant: 'pillInfo' },
  live: { text: m.project_card__live(), icon: Check, variant: 'pillOk' },
  sketch: { text: m.project_card__in_the_sketch_stage(), icon: Sparkles, variant: 'pillInfo' },
  paused: { text: m.project_card__paused(), icon: Pause, variant: 'pillMute' },
})

export function ProjectCard({ item }: { item: Project }) {
  const chip = chips()[item.state]
  const Icon = chip.icon
  return (
    <article data-testid={`project_card__${item.id}`} className="flex flex-col overflow-hidden rounded-card border border-border bg-card shadow-card" aria-label={asI18n(item.name)}>
      <div className="aspect-[2/1] overflow-hidden border-b border-border bg-secondary">
        {item.image ? <img src={item.image} alt="" className="size-full object-cover object-top" /> : <ProjectThumb look={item.look} label={asI18n(item.name)} />}
      </div>
      <div className="flex flex-1 flex-col gap-2.5 px-4.5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {item.state === 'sketch' ? null : (
            <Badge variant={chip.variant}>
              <Icon strokeWidth={2.5} />
              {chip.text}
            </Badge>
          )}
          {item.note ? (
            <Badge variant="warn">
              <TriangleAlert strokeWidth={2.5} />
              {item.note}
            </Badge>
          ) : null}
        </div>
        <b className="text-[19px] leading-[1.25]">{asI18n(item.name)}</b>
        <ProjectFacts item={item} className="text-[14px]" />
        <span className="text-ink-2 text-pretty">{asI18n(item.summary)}</span>
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-muted-foreground">
          {item.when ? <span>{m.project_card__last_worked_on({ when: item.when })}</span> : null}
          {item.state === 'running' ? (
            <span className="inline-flex items-center gap-1">
              <Lock className="size-3.5" strokeWidth={2.5} />
              
              {m.project_card__only_you_can_see()}
            </span>
          ) : null}
          {item.visitors ? <span>{m.project_card__visitors_this_week({ count: item.visitors })}</span> : null}
          {item.usage ? <span>{item.usage}</span> : null}
        </span>
        <ProjectActions item={item} className="mt-auto flex flex-wrap items-center gap-2 pt-2" />
      </div>
    </article>
  )
}
