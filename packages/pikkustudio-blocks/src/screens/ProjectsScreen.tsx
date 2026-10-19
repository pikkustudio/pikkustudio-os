import { m } from '@/i18n/messages'
import type { UseQueryResult } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { Link } from '../blocks/Link'
import { FolderPlus, Plus } from 'lucide-react'
import { Button } from '../ui/button'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { EmptyState } from '../blocks/EmptyState'
import { ProjectsGrid } from '../blocks/ProjectsGrid'
import type { Project, ProjectState } from '../blocks/ProjectCard'
import { CardsSkeleton, QueryState } from '../blocks/QueryState'
import { keep } from '../lib/links'
import { useTeamProjects, type ListedProject } from '../blocks/TeamProjects'
import { useSlot } from '../lib/studio-slots'
import { LOCAL_TEAM, useTeamSlug } from '../lib/team'
import type { ProjectOverlay } from '../lib/project-overlay'

const looks = ['bakery', 'kiln', 'garden', 'dog'] as const

const workspacesOf = (p: ListedProject) =>
  p.workspaces ?? (p.missing ? undefined : { local: p.location === 'cloud' ? 0 : 1, cloud: p.location === 'local' ? 0 : 1 })

export const toCard = (p: ListedProject): Project => ({
  id: p.key,
  slug: p.slug,
  name: p.name,
  summary: '',
  look: looks[[...p.key].reduce((n, c) => n + c.charCodeAt(0), 0) % looks.length],
  workspaces: workspacesOf(p),
  live: p.live,
  attention: p.attention,
  workingNow: p.workingNow,
  state: (p.missing || p.location === 'cloud' ? 'sketch' : p.busy ? 'progress' : p.open ? 'running' : 'paused') satisfies ProjectState,
})

const byVisit = (a: Project, b: Project) => Number(!!b.favourite) - Number(!!a.favourite) || (b.visitedAt ?? '').localeCompare(a.visitedAt ?? '')

const TeamSlug = ({ children }: { children: (name: string) => ReactNode }) => <>{children(useTeamSlug())}</>

const NO_OVERLAY: Record<string, ProjectOverlay> = {}
const NoOverlay = ({ children }: { children: (overlay: Record<string, ProjectOverlay>) => ReactNode }) => <>{children(NO_OVERLAY)}</>

export function ProjectsScreen() {
  const team = useTeamProjects()
  const Overlay = useSlot('projects.overlay', NoOverlay)
  const withOverlay = (overlay: Record<string, ProjectOverlay>) => ({ ...team, data: team.data?.map((p) => ({ ...toCard(p), ...overlay[p.key] })).sort(byVisit) }) as UseQueryResult<Project[]>
  const local = useTeamSlug() === LOCAL_TEAM
  const TeamName = useSlot('team.name', TeamSlug)

  return (
    <Page gap="snug">
      <PageHead
        crumb={local ? m.account_screen__on_this_computer() : <TeamName>{(team) => m.projects_screen__in_team({ team })}</TeamName>}
        title={m.projects_screen__title()}
        text={local ? m.projects_screen__lead_local() : <TeamName>{(team) => m.projects_screen__lead_team({ team })}</TeamName>}
        size="lead"
      >
        <Button asChild variant="default" size="page">
          <Link {...keep} to="/new-project">
            <Plus className="size-4.5" />
            {m.projects_screen__new_project()}
          </Link>
        </Button>
      </PageHead>
      <Overlay projects={team.data ?? []}>
        {(overlay) => (
          <QueryState
            query={withOverlay(overlay)}
            skeleton={<CardsSkeleton />}
            empty={(items) =>
              items.length ? null : (
                <EmptyState layout="row" icon={FolderPlus} title={m.projects_screen__none_title()} text={m.projects_screen__none_text()}>
                  <Button asChild size="page">
                    <Link {...keep} to="/new-project">{m.projects_screen__new_project()}</Link>
                  </Button>
                </EmptyState>
              )
            }
          >
            {(items) => <ProjectsGrid items={items} />}
          </QueryState>
        )}
      </Overlay>
    </Page>
  )
}
