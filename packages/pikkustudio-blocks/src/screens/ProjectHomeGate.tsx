import { useSearch } from '@tanstack/react-router'
import { useProjectName, useProjectSlug } from '../lib/project'
import { homeStates, projectHomes, type HomeState } from '../mocks/projectHome'
import { useTeamProjects } from '../blocks/TeamProjects'
import { OverviewScreen } from './OverviewScreen'
import { ProjectLandingScreen } from './ProjectLandingScreen'

export function ProjectHomeGate() {
  const slug = useProjectSlug()
  const name = useProjectName()
  const { state } = useSearch({ strict: false }) as { state?: HomeState }
  const project = useTeamProjects().data?.find((p) => p.slug === slug || p.key === slug)
  if (!project || !(project.key.startsWith('cloud:') || project.location !== 'local')) return <OverviewScreen />
  const current = homeStates.some(([id]) => id === state) ? (state as HomeState) : 'new'
  return <ProjectLandingScreen home={{ ...projectHomes[current], name }} onAct={() => undefined} />
}
