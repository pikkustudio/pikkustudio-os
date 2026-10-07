import type { UseQueryResult } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { FolderPlus, Plus } from 'lucide-react'
import { usePikkuMutation } from '@project/functions-sdk/pikku/api.gen'
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

const looks = ['bakery', 'kiln', 'garden', 'dog'] as const

const workspacesOf = (p: ListedProject) =>
  p.workspaces ?? (p.missing ? undefined : { local: p.location === 'cloud' ? 0 : 1, cloud: p.location === 'local' ? 0 : 1 })

const toCard = (p: ListedProject): Project => ({
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

const TeamSlug = () => <>{useTeamSlug()}</>

export function ProjectsScreen() {
  const team = useTeamProjects()
  const projects = { ...team, data: team.data?.map(toCard) } as UseQueryResult<Project[]>
  const signedIn = !!useAccount().data?.signIn
  const local = useTeamSlug() === LOCAL_TEAM
  const TeamName = useSlots().TeamName ?? TeamSlug
  const navigate = useNavigate()
  useEffect(() => {
    if (signedIn && projects.isSuccess && projects.data.length === 0) navigate({ to: '/new-project', search: ((prev: object) => prev) as never, replace: true })
  }, [signedIn, projects.isSuccess, projects.data?.length])
  const reopen = usePikkuMutation('studio:openProject', { onSuccess: () => team.refetch() })

  return (
    <Page gap="snug">
      <PageHead
        crumb={local ? 'On this computer' : <>In <TeamName /></>}
        title="Projects"
        text={local ? 'Everything you are making, kept on this computer. Open one to carry on where you stopped.' : <>Everything <TeamName /> is making, running on your computer or in the cloud. Open one to carry on where you stopped.</>}
        size="lead"
      >
        <Button asChild variant="default" size="page">
          <Link {...keep} to="/new-project">
            <Plus className="size-4.5" />
            New project
          </Link>
        </Button>
      </PageHead>
      {reopen.isError ? <p role="alert" className="text-destructive-foreground">That project could not be opened. Try again.</p> : null}
      <QueryState
        query={projects}
        skeleton={<CardsSkeleton />}
        empty={(items) =>
          items.length ? null : (
            <EmptyState layout="row" icon={FolderPlus} title="You have no projects yet." text="Start one and it will show up here.">
              <Button asChild size="page">
                <Link {...keep} to="/new-project">New project</Link>
              </Button>
            </EmptyState>
          )
        }
      >
        {(items) => <ProjectsGrid items={items} onRestore={(id) => reopen.mutate({ key: id })} />}
      </QueryState>
    </Page>
  )
}
