import { m } from '@/i18n/messages'
import { Link } from './Link'
import { ArrowRight, Pencil, Play } from 'lucide-react'
import { Button } from '../ui/button'
import { keep } from '../lib/links'
import type { Project } from './ProjectCard'
import type { ComponentType } from 'react'

const goesTo = { running: 'Open', progress: 'Open', live: 'Open', sketch: 'Continue' }

/** More on a project's card that a host brings. Given, it also takes the place of the card's Rename. */
export type ProjectCardExtra = ComponentType<{ item: Project }>

export function ProjectActions({ item, className, extra: Extra }: { item: Project; className?: string; extra?: ProjectCardExtra }) {
  const extra = !!Extra
  return (
    <div className={className}>
          {item.state === 'running' || item.state === 'progress' || item.state === 'live' ? (
            <Button asChild variant="default" size="compact">
              <Link {...keep} to="/home" search={((s: object) => ({ ...s, project: item.slug ?? item.id })) as any}>
                
                {m.project_actions__open()}
                <ArrowRight className="rtl:-scale-x-100 size-4.5" />
              </Link>
            </Button>
          ) : item.state === 'sketch' ? (
            <Button asChild variant="default" size="compact">
              <Link {...keep} to="/home" search={((s: object) => ({ ...s, project: item.slug ?? item.id })) as any}>
                {goesTo.sketch}
                <ArrowRight className="rtl:-scale-x-100 size-4.5" />
              </Link>
            </Button>
          ) : (
            <Button asChild variant="bordered" size="compact">
              <Link {...keep} to="/resume" search={((s: object) => ({ ...s, project: item.slug ?? item.id })) as any}>
                <Play className="size-4.5" />
                {m.project_actions__resume()}
              </Link>
            </Button>
          )}
          {item.state !== 'paused' && !extra ? (
            <Button variant="ghost" size="compactTight" type="button">
              <Pencil className="size-4" />
              
              {m.project_actions__rename()}
            </Button>
          ) : null}
          {Extra ? <Extra item={item} /> : null}
        </div>
  )
}
