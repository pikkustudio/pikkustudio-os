import type { I18nNode } from '@pikku/react'
import { useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { m } from '@/i18n/messages'
import { useNavigate } from '@tanstack/react-router'
import { isCloudKeyOf, useProjectKey } from '../lib/project'
import { DEFAULT_TARGET, formatTarget, useProjectTarget } from '../lib/project-target'
import { useProjectQuery } from '../lib/projectRpc'
import { AppNotRunning, CLOUD_LAUNCH, LOCAL_LAUNCH, launchSteps, phaseLabel, type LaunchPhase, type LaunchWhere, type StageWayOut } from './AppNotRunning'
import { useTeamProjects, type ListedProject } from './TeamProjects'

type LiveApp = { slug: string; state: 'starting' | 'ready' | 'failed' }
type Workspace = { state: 'off' | 'starting' | 'ready' | 'failed'; phase: LaunchPhase | null; error: string | null }

const WAKE_GRACE_MS = 60_000
const STALL_MS = 8 * 60_000

const label = (slug: string) => slug.charAt(0).toUpperCase() + slug.slice(1).replace(/[-_]+/g, ' ')
const messageOf = (error: unknown) => (error instanceof Error ? error.message : '')

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
  return key.startsWith('cloud:') ? <CloudGate project={{ ...project, key }}>{children}</CloudGate> : <LocalGate project={project}>{children}</LocalGate>
}

function StageGate({ stage, children }: { stage: StageWayOut; children: I18nNode }) {
  const meta = useProjectQuery(useProjectKey(), 'console:getAllMeta', {}, { handlesErrors: true })
  const status = (meta.error as { status?: number } | null)?.status ?? 0
  if (status === 500) return <AppNotRunning state="off" onStart={stage.onWorkspace} stage={{ ...stage, outdated: true }} />
  return <>{children}</>
}

function CloudGate({ project, children }: { project: ListedProject; children: I18nNode }) {
  const client = useQueryClient()
  const navigate = useNavigate()
  const status = usePikkuQuery('studio:workspaceStatus' as never, { key: project.key } as never, {
    retry: false,
    refetchInterval: (query: { state: { data?: Workspace } }) => (query.state.data?.state === 'starting' ? 3000 : 15000),
  } as never) as { data?: Workspace; isPending: boolean; refetch: () => void }
  const link = usePikkuMutation('studio:workspaceLink', { onSettled: () => status.refetch() })
  const clone = usePikkuMutation('studio:cloneProject', { onSuccess: () => client.invalidateQueries({ queryKey: ['studio:listProjects'] }) })

  const now = status.data ?? { state: 'off', phase: null, error: null }
  const [stall, setStall] = useState<{ phase: LaunchPhase; since: number } | null>(null)
  const phase = now.state === 'starting' ? (now.phase ?? 'machine') : null
  useEffect(() => {
    setStall((was) => (phase ? (was?.phase === phase ? was : { phase, since: Date.now() }) : null))
  }, [phase])
  const stalled = !!stall && Date.now() - stall.since > STALL_MS
  const waking = link.isPending || (link.isSuccess && now.state === 'off' && Date.now() - link.submittedAt < WAKE_GRACE_MS)
  const pick = (where: LaunchWhere) => {
    setStall(null)
    if (where === 'cloud') link.mutate({ key: project.key })
    else if (project.location === 'both') navigate({ to: '.', search: ((prev: object) => ({ ...prev, target: formatTarget(DEFAULT_TARGET) })) as never })
    else if (project.cloudProjectId) clone.mutate({ cloudProjectId: project.cloudProjectId } as never)
  }

  if (now.state === 'ready') return <>{children}</>
  if (clone.isPending) return <AppNotRunning state="starting" steps={launchSteps(LOCAL_LAUNCH, 'sync')} onStart={() => undefined} />
  if (clone.isError) return <AppNotRunning state="failed" name={project.name} error={clone.error} onStart={() => pick('local')} />
  if (link.isError) return <AppNotRunning state="failed" name={project.name} reason={m.project_launch__failed_cloud()} logText={messageOf(link.error)} onStart={() => pick('cloud')} />
  if (now.state === 'failed' && !waking) return <AppNotRunning state="failed" name={project.name} reason={m.project_launch__failed_cloud()} logText={now.error ?? ''} onStart={() => pick('cloud')} />
  if (stalled && stall && !link.isPending)
    return <AppNotRunning state="failed" name={project.name} reason={m.project_launch__stalled({ step: phaseLabel(stall.phase) })} logText={`Workspace start has been at the "${stall.phase}" step since ${new Date(stall.since).toISOString()}.`} onStart={() => pick('cloud')} />
  if (now.state === 'starting' || waking) return <AppNotRunning state="starting" steps={launchSteps(CLOUD_LAUNCH, now.state === 'starting' ? (now.phase ?? 'machine') : 'machine')} onStart={() => undefined} />
  if (status.isPending) return <AppNotRunning state="starting" steps={launchSteps(CLOUD_LAUNCH, 'machine')} onStart={() => undefined} />
  return <AppNotRunning state="off" onStart={() => pick('cloud')} choices={{ primary: 'cloud', onPick: pick, cloudOff: false }} />
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
