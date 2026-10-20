import type { I18nNode } from '@pikku/react'
import { m } from '@/i18n/messages'
import { Cloud, Globe, Monitor, TriangleAlert, Users } from 'lucide-react'
import { cn } from '../lib/utils'
import type { Project } from './ProjectCard'

const names = (who: string[]) =>
  who.length === 1
    ? m.project_facts__working_one({ name: who[0] ?? '' })
    : who.length === 2
      ? m.project_facts__working_two({ first: who[0] ?? '', second: who[1] ?? '' })
      : m.project_facts__working_count({ count: who.length })

const Fact = ({ icon: Icon, className, children }: { icon: typeof Cloud; className?: string; children: I18nNode }) => (
  <span className={cn('inline-flex items-center gap-1', className)}>
    <Icon className="size-3.5 shrink-0" strokeWidth={2.5} />
    {children}
  </span>
)

export function ProjectFacts({ item, className }: { item: Project; className?: string }) {
  const { workspaces, live, attention, workingNow } = item
  const placed = (workspaces?.local ?? 0) + (workspaces?.online ?? 0)
  const empty = workspaces && !placed && !live && !attention && !workingNow?.length
  const shown = !!(workspaces || live !== undefined || attention || workingNow?.length)
  if (!shown) return null
  return (
    <span data-testid="project_facts" className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground', className)}>
      {empty ? (
        <span>{m.project_facts__nothing_yet()}</span>
      ) : (
        <>
          {attention ? <Fact icon={TriangleAlert} className="font-bold text-warning-foreground">{m.project_facts__attention({ count: attention })}</Fact> : null}
          {workingNow?.length ? <Fact icon={Users}>{names(workingNow)}</Fact> : null}
          {workspaces?.local ? <Fact icon={Monitor}>{m.project_facts__local({ count: workspaces.local })}</Fact> : null}
          {workspaces?.online ? <Fact icon={Cloud}>{m.project_facts__online({ count: workspaces.online })}</Fact> : null}
          {live ? <Fact icon={Globe} className="text-success-foreground">{m.project_facts__live({ count: live.places })}</Fact> : live === null ? <span>{m.project_facts__not_live()}</span> : null}
        </>
      )}
    </span>
  )
}
