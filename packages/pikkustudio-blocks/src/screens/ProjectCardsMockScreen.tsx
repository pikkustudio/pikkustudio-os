import { m } from '@/i18n/messages'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { ProjectsGrid } from '../blocks/ProjectsGrid'
import { projectCards } from '../mocks/project-cards'

export function ProjectCardsMockScreen() {
  return (
    <Page gap="snug">
      <PageHead crumb={m.project_cards_mock__crumb()} title={m.project_cards_mock__title()} text={m.project_cards_mock__text()} size="lead" />
      <ProjectsGrid items={projectCards} />
    </Page>
  )
}
