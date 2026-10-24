import type { UseQueryResult } from '@tanstack/react-query'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useTeamSlug } from '../lib/team'
import type { ProjectOverview } from '../lib/project-overlay'

export type ListedProject = {
  key: string
  slug: string
  owner?: string
  name: string
  /** On this computer when it has a path. */
  path?: string | null
  /** The contributed source that holds the project, and its id there. */
  source: string | null
  sourceId: string | null
  open: boolean
  busy?: boolean
  missing: boolean
  workspaces?: Record<string, number> // by where: `local`, or a source's namespace
  live?: { places: number } | null
  attention?: number
  workingNow?: string[]
  /** What a host knows about the project beyond this computer, when it knows anything. */
  overview?: ProjectOverview
}

const BUSY_MS = 5000
const QUIET_MS = 30000
const busy = (projects: ListedProject[] | undefined) => !!projects?.some((p) => p.busy || p.overview?.state === 'progress')

// The projects of the team in the URL: Studio lists them by team, so the `local` team is what is
// only on this computer and a team is what is online. Asked again every 30 seconds (5 while one is busy) so a
// host's overview of them stays current.
export const useTeamProjects = () => {
  const team = useTeamSlug()
  return usePikkuQuery('studio:listProjects', { team }, {
    enabled: !!team,
    refetchInterval: (q: { state: { data?: { projects: ListedProject[] } } }) => (busy(q.state.data?.projects) ? BUSY_MS : QUIET_MS),
    select: (d: { projects: ListedProject[] }) => d.projects,
  } as never) as unknown as UseQueryResult<ListedProject[]>
}
