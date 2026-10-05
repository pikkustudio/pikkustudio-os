import type { UseQueryResult } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { Button } from '../ui/button'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { EmptyState } from '../blocks/EmptyState'
import { ProjectsGrid } from '../blocks/ProjectsGrid'
import type { Project, ProjectState } from '../blocks/ProjectCard'
import { CardsSkeleton, QueryState } from '../blocks/QueryState'
import { keep } from '../lib/links'

const looks = ['bakery', 'kiln', 'garden', 'dog'] as const

const toCard = (p: { key: string; slug: string; owner?: string; name: string; location: string; open: boolean; missing: boolean }): Project => ({
  id: p.key,
  slug: p.owner ? `${p.owner}/${p.slug}` : p.slug,
  name: p.name,
  summary: p.location === 'cloud' ? 'In Fabric' : 'On this computer',
  look: looks[[...p.key].reduce((n, c) => n + c.charCodeAt(0), 0) % looks.length],
  state: (p.missing ? 'paused' : p.open ? 'running' : 'sketch') satisfies ProjectState,
})

export function ProjectsScreen() {
  const projects = usePikkuQuery('studio:listProjects', {}, { select: (d: { projects: Parameters<typeof toCard>[0][] }) => d.projects.map(toCard) } as never) as unknown as UseQueryResult<Project[]>
  const reopen = usePikkuMutation('studio:openProject', { onSuccess: () => projects.refetch() })

  return (
    <Page gap="snug">
      <PageHead crumb="On this computer" title="Projects" text="Everything you are making, kept on this computer. Open one to carry on where you stopped." size="lead">
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
            <EmptyState layout="row" title="You have no projects yet." text="Start one and it will show up here.">
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
