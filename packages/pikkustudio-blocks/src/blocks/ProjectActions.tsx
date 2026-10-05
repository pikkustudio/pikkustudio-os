import { m } from '@/i18n/messages'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Pencil, RotateCcw } from 'lucide-react'
import { Button } from '../ui/button'
import { keep } from '../lib/links'
import type { Project } from './ProjectCard'

const goesTo = { running: 'Open', live: 'Open', sketch: 'Continue', paused: 'Restore' }

export function ProjectActions({ item, onRestore, className }: { item: Project; onRestore: () => void; className?: string }) {
  return (
    <div className={className}>
          {item.state === 'running' || item.state === 'live' ? (
            <Button asChild variant="default" size="compact">
              <Link {...keep} to="/overview" search={((s: object) => ({ ...s, project: item.slug ?? item.id })) as any}>
                
                {m.project_actions__open()}
                <ArrowRight className="size-4.5" />
              </Link>
            </Button>
          ) : item.state === 'sketch' ? (
            <Button asChild variant="default" size="compact">
              <Link {...keep} to="/artifacts" search={((s: object) => ({ ...s, project: item.slug ?? item.id })) as any}>
                {goesTo.sketch}
                <ArrowRight className="size-4.5" />
              </Link>
            </Button>
          ) : (
            <Button variant="bordered" size="compact" type="button" onClick={onRestore}>
              <RotateCcw className="size-4.5" />
              {goesTo.paused}
            </Button>
          )}
          {item.state !== 'paused' ? (
            <Button variant="ghost" size="compactTight" type="button">
              <Pencil className="size-4" />
              
              {m.project_actions__rename()}
            </Button>
          ) : null}
        </div>
  )
}
