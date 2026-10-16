import { m } from '@/i18n/messages'
import type { UseQueryResult } from '@tanstack/react-query'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import type { Project } from '../blocks/ProjectCard'
import { ProjectsGrid } from '../blocks/ProjectsGrid'
import { CardsSkeleton, QueryState } from '../blocks/QueryState'
import { useTeamProjects } from '../blocks/TeamProjects'
import { toCard } from './ProjectsScreen'

export function ProjectCardsMockScreen() {
  const team = useTeamProjects()
  const projects = { ...team, data: team.data?.map(toCard) } as UseQueryResult<Project[]>
  return (
    <Page gap="snug">
      <PageHead crumb={m.project_cards_mock__crumb()} title={m.project_cards_mock__title()} text={m.project_cards_mock__text()} size="lead" />
      <QueryState query={projects} skeleton={<CardsSkeleton />}>
        {(items) => <ProjectsGrid items={items} />}
      </QueryState>
    </Page>
  )
}
