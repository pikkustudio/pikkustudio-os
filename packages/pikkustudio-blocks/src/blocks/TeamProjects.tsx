import type { UseQueryResult } from '@tanstack/react-query'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useTeamSlug } from '../lib/team'

export type ListedProject = {
  key: string
  slug: string
  owner?: string
  name: string
  location: 'local' | 'cloud' | 'both'
  fabricProjectId: string | null
  open: boolean
  busy?: boolean
  missing: boolean
}

// The projects of the team in the URL: Studio lists them by team, so the `local` team is what is
// only on this computer and a Fabric team is what is in Fabric.
export const useTeamProjects = () => {
  const team = useTeamSlug()
  return usePikkuQuery('studio:listProjects', { team }, {
    enabled: !!team,
    select: (d: { projects: ListedProject[] }) => d.projects,
  } as never) as unknown as UseQueryResult<ListedProject[]>
}
