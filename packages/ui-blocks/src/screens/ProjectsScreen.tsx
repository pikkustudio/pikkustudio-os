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
import type { ProjectCardExtra } from '../blocks/ProjectActions'
import type { Project, ProjectState } from '../blocks/ProjectCard'
import { CardsSkeleton, QueryState } from '../blocks/QueryState'
import { keep } from '../lib/links'
import { useTeamProjects, type ListedProject } from '../blocks/TeamProjects'
import { useCurrentTeam } from '../lib/account'
import { LOCAL_TEAM, useTeamSlug } from '../lib/team'
import { overlayOf } from '../lib/project-overlay'

const looks = ['bakery', 'kiln', 'garden', 'dog'] as const

const workspacesOf = (p: ListedProject) =>
  p.workspaces ?? (p.missing ? undefined : { local: p.path ? 1 : 0, ...(p.source ? { [p.source]: p.sourceId ? 1 : 0 } : {}) })

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
  state: (p.missing || !p.path ? 'sketch' : p.busy ? 'progress' : p.open ? 'running' : 'paused') satisfies ProjectState,
})

// Latest visit first; anything that isn't a time sorts as never visited.
const visitTime = (v: unknown) => (typeof v === 'string' || v instanceof Date ? new Date(v).getTime() || 0 : 0)
export const byVisit = (a: Project, b: Project) => Number(!!b.favourite) - Number(!!a.favourite) || visitTime(b.visitedAt) - visitTime(a.visitedAt)

// The team's name where the signed-in account knows it, else its slug.
const TeamName = ({ children }: { children: (name: string) => ReactNode }) => {
  const slug = useTeamSlug()
  const team = useCurrentTeam()
  return <>{children(team?.slug === slug ? team.name : slug)}</>
}

/** The team's projects. `cardExtra` is more a host shows on each project's card. */
export function ProjectsScreen({ cardExtra }: { cardExtra?: ProjectCardExtra } = {}) {
  const team = useTeamProjects()
  const cards = { ...team, data: team.data?.map((p) => ({ ...toCard(p), ...overlayOf(p) })).sort(byVisit) } as UseQueryResult<Project[]>
  const local = useTeamSlug() === LOCAL_TEAM

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
      <QueryState
        query={cards}
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
        {(items) => <ProjectsGrid items={items} cardExtra={cardExtra} />}
      </QueryState>
    </Page>
  )
}
