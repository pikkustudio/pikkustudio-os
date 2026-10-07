import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { ProjectsGrid } from '../blocks/ProjectsGrid'
import { projectCards } from '../mocks/project-cards'

export function ProjectCardsMockScreen() {
  return (
    <Page gap="snug">
      <PageHead crumb="Mock" title="Projects" text="Every state a project card can show." size="lead" />
      <ProjectsGrid items={projectCards} onRestore={() => {}} />
    </Page>
  )
}
