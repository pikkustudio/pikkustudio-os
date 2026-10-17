import { m } from '@/i18n/messages'
import type { UseQueryResult } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'
import { useNavigate } from '@tanstack/react-router'
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
import { useAccount } from '../lib/onboarding'
import { useSlots } from '../lib/slots'
import { LOCAL_TEAM, useTeamSlug } from '../lib/team'
import { useProjectSlots } from '../lib/project-slots'

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

const TeamSlug = ({ children }: { children: (name: string) => ReactNode }) => <>{children(useTeamSlug())}</>

export function ProjectsScreen() {
  const team = useTeamProjects()
  const { useProjectOverlay, ProjectsLead } = useProjectSlots()
  const overlay = useProjectOverlay?.(team.data ?? []) ?? {}
  const projects = { ...team, data: team.data?.map((p) => ({ ...toCard(p), ...overlay[p.key] })) } as UseQueryResult<Project[]>
  const signedIn = !!useAccount().data?.signIn
  const local = useTeamSlug() === LOCAL_TEAM
  const TeamName = useSlots().TeamName ?? TeamSlug
  const navigate = useNavigate()
  useEffect(() => {
    if (signedIn && projects.isSuccess && projects.data.length === 0) navigate({ to: '/new-project', search: ((prev: object) => prev) as never, replace: true })
  }, [signedIn, projects.isSuccess, projects.data?.length])

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
      {ProjectsLead ? <ProjectsLead /> : null}
      <QueryState
        query={projects}
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
    </Page>
  )
}
