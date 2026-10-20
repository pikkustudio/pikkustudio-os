import { asI18n, usePikkuRPC, type I18nString } from '@pikku/react'
import { useNavigate } from '@tanstack/react-router'
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { Eye, Laptop, Pencil } from 'lucide-react'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { m } from '@/i18n/messages'
import { useTeamProjects } from './TeamProjects'
import { onlineKey, useProjectSlug } from '../lib/project'
import { ProjectRpcCtx, type ProjectInvoke } from '../lib/projectRpc'
import { useTeamSlug } from '../lib/team'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import {
  DEFAULT_TARGET,
  LOCAL_WORKSPACE,
  ProjectTargetProvider as TargetContextProvider,
  bindRpc,
  formatTarget,
  lastTarget,
  parseTarget,
  readOnlyInvoke,
  rememberTarget,
  sameTarget,
  usePutTargetInUrl,
  useProjectTarget,
  useUrlTarget,
  type ProjectTarget,
  type TargetRef,
} from '../lib/project-target'

// Where the open project's screens read from: studio:targets lists them (this computer's workspace, and whatever a
// host adds: cloud workspaces, published stages), studio:targetCall calls a published stage. The URL's `target`
// picks one; without it, the last one picked, else the live production stage, else the default workspace.

type Option = TargetRef & { label: I18nString; live: boolean; production: boolean; isDefault: boolean; branch: string | null; forChanges: boolean }

type Listed = { kind: TargetRef['kind']; name: string; label: string | null; live: boolean; production: boolean; isDefault: boolean; branch: string | null; forChanges: boolean }

const TARGETS_STALE_MS = 30_000

const OptionsCtx = createContext<Option[]>([])

const labelOf = (t: Listed): I18nString =>
  t.kind === 'workspace' && t.name === LOCAL_WORKSPACE ? m.project_target__computer() : t.kind === 'stage' && t.production ? m.project_target__live() : asI18n(t.label ?? t.name)

const pickDefault = (options: readonly Option[], last: TargetRef | undefined): TargetRef => {
  if (last && options.some((o) => sameTarget(o, last))) return last
  const live = options.find((o) => o.kind === 'stage' && o.production && o.live)
  if (live) return { kind: 'stage', name: live.name }
  const ws = options.find((o) => o.kind === 'workspace' && o.isDefault) ?? options.find((o) => o.kind === 'workspace')
  return ws ? { kind: 'workspace', name: ws.name } : DEFAULT_TARGET
}

export function ProjectTargetsProvider({ children }: { children: ReactNode }) {
  const slug = useProjectSlug()
  const team = useTeamSlug()
  const navigate = useNavigate()
  const base = useContext(ProjectRpcCtx)
  const rpc = usePikkuRPC<{ invoke: (name: string, data: unknown) => Promise<unknown> }>()
  const projects = useTeamProjects()
  const project = projects.data?.find((p) => p.key === slug || p.slug === slug || `${p.owner}/${p.slug}` === slug)
  const projectKey = project?.key ?? ''
  const listed = usePikkuQuery('studio:targets', { key: projectKey }, { enabled: !!projectKey, staleTime: TARGETS_STALE_MS } as never) as { data?: { targets: Listed[] }; isFetched: boolean; isError: boolean }

  const options = useMemo<Option[]>(() => (listed.data?.targets ?? []).map((t) => ({ ...t, label: labelOf(t) })), [listed.data])

  const loaded = !!project && projects.isFetched && (listed.isFetched || listed.isError)
  const fromUrl = useUrlTarget()
  const valid = !!fromUrl && options.some((o) => sameTarget(o, fromUrl))
  const missing = loaded && !!fromUrl && !valid
  const chosen = loaded && !missing ? (valid ? fromUrl : pickDefault(options, lastTarget(team, slug))) : undefined
  usePutTargetInUrl(chosen)
  const ref: TargetRef = chosen ?? fromUrl ?? DEFAULT_TARGET
  const remember = chosen && valid ? formatTarget(chosen) : ''
  useEffect(() => {
    const t = parseTarget(remember)
    if (t && team && slug) rememberTarget(team, slug, t)
  }, [remember, team, slug])

  const option = options.find((o) => sameTarget(o, ref))
  const workspace = options.find((o) => o.kind === 'workspace' && o.isDefault) ?? options.find((o) => o.kind === 'workspace')
  const workspaceName = workspace?.name ?? ''
  const invoke = useMemo<ProjectInvoke>(() => {
    if (ref.kind !== 'stage') return base
    return readOnlyInvoke((_key, name, data) => rpc.invoke('studio:targetCall', { key: projectKey, target: ref, name, data }) as never, ref.name)
  }, [ref.kind, ref.name, projectKey, rpc, base])
  const key = project ? onlineKey(project, ref) : slug
  const value = useMemo<ProjectTarget>(
    () => ({
      kind: ref.kind,
      name: ref.name,
      readOnly: ref.kind === 'stage',
      changesOnly: ref.kind === 'workspace' && !!option?.forChanges,
      missing,
      rpc: bindRpc(invoke, key),
      live: ref.kind === 'stage' ? (option?.live ?? false) : undefined,
      openWorkspace: workspaceName ? () => void navigate({ to: '.', search: ((prev: object) => ({ ...prev, target: formatTarget({ kind: 'workspace', name: workspaceName }) })) as never }) : undefined,
    }),
    [ref.kind, ref.name, invoke, key, option?.live, option?.forChanges, workspaceName, missing],
  )
  return (
    <OptionsCtx.Provider value={options}>
      <TargetContextProvider value={value} invoke={invoke}>
        {children}
      </TargetContextProvider>
    </OptionsCtx.Provider>
  )
}

const note = (o: Option): I18nString | null => (o.kind === 'stage' ? (o.live ? m.project_target__view_only() : m.project_target__not_published()) : o.branch ? asI18n(o.branch) : null)

/** The switcher above a project's nav: the targets studio:targets lists (in the open build, this computer's workspace). */
export function TargetSwitcher({ collapsed }: { collapsed: boolean }) {
  const options = useContext(OptionsCtx)
  const target = useProjectTarget()
  const navigate = useNavigate()
  if (collapsed || !options.length) return null
  const current = formatTarget(target)
  const pick = (value: string) => {
    const t = parseTarget(value)
    if (t) void navigate({ to: '.', search: ((prev: object) => ({ ...prev, target: formatTarget(t) })) as never })
  }
  const workspaces = options.filter((o) => o.kind === 'workspace')
  const stages = options.filter((o) => o.kind === 'stage')
  const row = (o: Option) => {
    const Icon = o.kind === 'stage' ? Eye : o.name === LOCAL_WORKSPACE ? Laptop : Pencil
    const extra = note(o)
    return (
      <SelectItem key={formatTarget(o)} value={formatTarget(o)} data-testid={`target-option-${o.kind}-${o.name}`}>
        <span className="flex items-center gap-2">
          <Icon className="size-4 shrink-0 text-muted-foreground" />
          <span className="font-semibold">{o.label}</span>
          {extra ? <span className="text-muted-foreground">{m.project_target__dot()}{extra}</span> : null}
        </span>
      </SelectItem>
    )
  }
  const heading = (text: I18nString) => <div className="px-3 pt-2 pb-1 text-px13 font-semibold text-muted-foreground">{text}</div>
  return (
    <div className="mb-2 px-1" data-testid="project-target-switcher">
      <Select value={current} onValueChange={pick}>
        <SelectTrigger aria-label={m.project_target__label()} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {workspaces.length ? heading(m.project_target__group_workspaces()) : null}
          {workspaces.map(row)}
          {stages.length ? heading(m.project_target__group_stages()) : null}
          {stages.map(row)}
        </SelectContent>
      </Select>
    </div>
  )
}
