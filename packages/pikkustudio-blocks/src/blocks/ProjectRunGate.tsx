import type { I18nNode } from '@pikku/react'
import { useEffect, useRef } from 'react'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { m } from '@/i18n/messages'
import { useNavigate } from '@tanstack/react-router'
import { isCloudKeyOf, useProjectKey } from '../lib/project'
import { useProjectTarget } from '../lib/project-target'
import { useProjectQuery } from '../lib/projectRpc'
import { AppNotRunning, LOCAL_LAUNCH, launchSteps, type LaunchPhase, type LaunchWhere, type StageWayOut } from './AppNotRunning'
import { useTeamProjects, type ListedProject } from './TeamProjects'
import { CardsSkeleton } from './QueryState'

type LiveApp = { slug: string; state: 'starting' | 'ready' | 'failed' }


const label = (slug: string) => slug.charAt(0).toUpperCase() + slug.slice(1).replace(/[-_]+/g, ' ')

export function ProjectRunGate({ children }: { children: I18nNode }) {
  const key = useProjectKey()
  const target = useProjectTarget()
  const navigate = useNavigate()
  const project = useTeamProjects().data?.find((p) => isCloudKeyOf(p, key))
  if (target.kind === 'stage') {
    const wayOut = {
      name: target.name,
      onPublish: () => navigate({ to: '/publish' as never, search: ((prev: object) => prev) as never }),
      onWorkspace: () => target.openWorkspace?.(),
    }
    if (target.live !== false) return <StageGate stage={wayOut}>{children}</StageGate>
    return <AppNotRunning state="off" onStart={wayOut.onWorkspace} stage={wayOut} />
  }
  if (!key || !project) return <>{children}</>
  return <LocalGate project={project}>{children}</LocalGate>
}

function StageGate({ stage, children }: { stage: StageWayOut; children: I18nNode }) {
  const meta = useProjectQuery(useProjectKey(), 'console:getAllMeta', {}, { handlesErrors: true })
  const status = (meta.error as { status?: number } | null)?.status ?? 0
  if (meta.isLoading) return <CardsSkeleton />
  if (meta.isError && (status === 500 || status === 0)) return <AppNotRunning state="off" onStart={stage.onWorkspace} stage={{ ...stage, outdated: true }} />
  return <>{children}</>
}

function LocalGate({ project, children }: { project: ListedProject; children: I18nNode }) {
  const key = project.key
  const tried = useRef<string>('')
  const apps = usePikkuQuery('studio:projectApps', { key }, {
    refetchInterval: (query: { state: { data?: LiveApp[] } }) => ((query.state.data ?? []).length > 0 && (query.state.data ?? []).every((a) => a.state === 'ready') ? 15000 : 2000),
  } as never)
  const start = usePikkuMutation('studio:openProject', { onSuccess: () => apps.refetch() })
  const restart = usePikkuMutation('studio:closeProject', { onSuccess: () => start.mutate({ key }) })

  const list = (apps.data as LiveApp[] | undefined) ?? []
  const idle = apps.isSuccess && list.length === 0
  useEffect(() => {
    if (idle && tried.current !== key && !start.isPending) {
      tried.current = key
      start.mutate({ key })
    }
  }, [idle, key, start])

  const phase: LaunchPhase = list.length === 0 ? 'sync' : list.some((a) => a.state !== 'ready') ? 'project' : 'connect'
  const steps = launchSteps(LOCAL_LAUNCH, phase)
  const broken = list.find((a) => a.state === 'failed')
  const name = broken ? label(broken.slug) : undefined
  const pick = (where: LaunchWhere) => {
    if (where === 'local') start.mutate({ key })
  }
  if (apps.isPending) return <AppNotRunning state="starting" steps={steps} onStart={() => undefined} />
  if (broken || start.isError) return <AppNotRunning state="failed" name={name} error={start.error ?? restart.error} onStart={() => restart.mutate({ key })} starting={restart.isPending || start.isPending} />
  if (list.length === 0 && (start.isPending || start.isSuccess || tried.current !== key)) return <AppNotRunning state="starting" steps={steps} onStart={() => undefined} />
  if (list.length === 0) return <AppNotRunning state="off" onStart={() => pick('local')} choices={{ primary: 'local', onPick: pick, cloudOff: true }} />
  if (list.some((a) => a.state !== 'ready')) return <AppNotRunning state="starting" steps={steps} onStart={() => undefined} />
  return <>{children}</>
}
