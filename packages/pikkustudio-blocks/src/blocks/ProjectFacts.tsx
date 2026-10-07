import { Cloud, Globe, Monitor, TriangleAlert, Users } from 'lucide-react'
import { cn } from '../lib/utils'
import type { Project } from './ProjectCard'

const many = (n: number, one: string, more: string) => (n === 1 ? one : more.replace('#', String(n)))

const names = (who: string[]) =>
  who.length === 1 ? `${who[0]} is working in it` : who.length === 2 ? `${who[0]} and ${who[1]} are working in it` : `${who.length} people are working in it`

const Fact = ({ icon: Icon, className, children }: { icon: typeof Cloud; className?: string; children: React.ReactNode }) => (
  <span className={cn('inline-flex items-center gap-1', className)}>
    <Icon className="size-3.5 shrink-0" strokeWidth={2.5} />
    {children}
  </span>
)

export function ProjectFacts({ item, className }: { item: Project; className?: string }) {
  const { workspaces, live, attention, workingNow } = item
  const placed = (workspaces?.local ?? 0) + (workspaces?.cloud ?? 0)
  const empty = workspaces && !placed && !live && !attention && !workingNow?.length
  const shown = !!(workspaces || live !== undefined || attention || workingNow?.length)
  if (!shown) return null
  return (
    <span data-testid="project_facts" className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground', className)}>
      {empty ? (
        <span>Nothing here yet. Open it to make a start.</span>
      ) : (
        <>
          {attention ? <Fact icon={TriangleAlert} className="font-bold text-warning-foreground">{many(attention, '1 thing to look at', '# things to look at')}</Fact> : null}
          {workingNow?.length ? <Fact icon={Users}>{names(workingNow)}</Fact> : null}
          {workspaces?.local ? <Fact icon={Monitor}>{workspaces.local} on your computer</Fact> : null}
          {workspaces?.cloud ? <Fact icon={Cloud}>{workspaces.cloud} in the cloud</Fact> : null}
          {live ? <Fact icon={Globe} className="text-success-foreground">{many(live.places, 'Live', 'Live in # places')}</Fact> : live === null ? <span>Not live yet</span> : null}
        </>
      )}
    </span>
  )
}
