import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { Lock, TriangleAlert } from 'lucide-react'
import { Badge } from '../ui/badge'
import { chips, type Project } from './ProjectCard'
import { ProjectActions } from './ProjectActions'
import { ProjectFacts } from './ProjectFacts'
import { ProjectThumb } from './ProjectThumb'

export function ProjectRow({ item }: { item: Project }) {
  const chip = chips()[item.state]
  const Icon = chip.icon
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-border bg-card px-3.5 py-2.5 shadow-card">
      <div className="aspect-[2/1] w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-secondary">
        <ProjectThumb look={item.look} label={asI18n(item.name)} />
      </div>
      <div className="flex min-w-60 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <b className="text-[17px] leading-[1.3]">{asI18n(item.name)}</b>
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
        <ProjectFacts item={item} className="text-px13" />
        <span className="truncate text-px14 text-ink-2">{asI18n(item.summary)}</span>
        <span className="flex items-center gap-3 text-px13 text-muted-foreground">
          {item.when ? m.project_row__last_worked_on({ when: item.when }) : null}
          {item.state === 'running' ? <span className="inline-flex items-center gap-1"><Lock className="size-3.5" strokeWidth={2.5} />{m.project_row__only_you_can_see()}</span> : null}
          {item.visitors ? <span>{m.project_card__visitors_this_week({ count: item.visitors })}</span> : null}
        </span>
      </div>
      <ProjectActions item={item} className="flex items-center gap-2" />
    </li>
  )
}
