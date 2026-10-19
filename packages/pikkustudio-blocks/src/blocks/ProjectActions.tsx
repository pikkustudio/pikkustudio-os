import { m } from '@/i18n/messages'
import { Link } from './Link'
import { ArrowRight, Pencil, Play } from 'lucide-react'
import { Button } from '../ui/button'
import { keep } from '../lib/links'
import type { Project } from './ProjectCard'
import { useProjectSlots } from '../lib/project-slots'

const goesTo = { running: 'Open', progress: 'Open', live: 'Open', sketch: 'Continue' }

export function ProjectActions({ item, className }: { item: Project; className?: string }) {
  const { ProjectCardExtra } = useProjectSlots()
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
          {item.state !== 'paused' && !ProjectCardExtra ? (
            <Button variant="ghost" size="compactTight" type="button">
              <Pencil className="size-4" />
              
              {m.project_actions__rename()}
            </Button>
          ) : null}
          {ProjectCardExtra ? <ProjectCardExtra item={item} /> : null}
        </div>
  )
}
