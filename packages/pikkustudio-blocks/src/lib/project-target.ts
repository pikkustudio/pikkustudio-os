import { useNavigate, useSearch } from '@tanstack/react-router'
import { createContext, createElement, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { ProjectRpcCtx, type ProjectInvoke } from './projectRpc'
import { useProjectKey } from './project'

export type ProjectTargetKind = 'workspace' | 'stage'
export type TargetRef = { kind: ProjectTargetKind; name: string }
export type TargetRpc = { invoke: <T = any>(name: string, data?: unknown) => Promise<T> }
export type ProjectTarget = TargetRef & { readOnly: boolean; changesOnly?: boolean; missing?: boolean; rpc: TargetRpc; live?: boolean; openWorkspace?: () => void }

export const LOCAL_WORKSPACE = 'local'

export const DEFAULT_TARGET: TargetRef = { kind: 'workspace', name: LOCAL_WORKSPACE }

export const isTargetKind = (v: unknown): v is ProjectTargetKind => v === 'workspace' || v === 'stage'

export const formatTarget = (t: TargetRef) => `${t.kind}/${t.name}`

export const parseTarget = (v: unknown): TargetRef | undefined => {
  if (typeof v !== 'string') return undefined
  const [kind, ...rest] = v.replace(/^"(.*)"$/, '$1').split('/')
  const name = rest.join('/')
  return isTargetKind(kind) && name ? { kind, name } : undefined
}

export const sameTarget = (a: TargetRef, b: TargetRef) => a.kind === b.kind && a.name === b.name

export const useUrlTarget = () => parseTarget((useSearch({ strict: false }) as { target?: string }).target)

const noRpc: TargetRpc = {
  invoke: async (name) => {
    throw new Error(`No project is open for ${name}`)
  },
}

export const ProjectTargetContext = createContext<ProjectTarget>({ kind: 'workspace', name: LOCAL_WORKSPACE, readOnly: false, rpc: noRpc })

export const useProjectTarget = () => useContext(ProjectTargetContext)

export const useCanEdit = () => !useContext(ProjectTargetContext).readOnly

export const ReadOnlyGate = ({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) => (useCanEdit() ? children : fallback)

export const bindRpc = (invoke: ProjectInvoke, key: string): TargetRpc => ({ invoke: (name, data) => invoke(key, name, data) })

export function ProjectTargetProvider({ value, invoke, children }: { value: ProjectTarget; invoke?: ProjectInvoke; children: ReactNode }) {
  const inner = createElement(ProjectTargetContext.Provider, { value }, children)
  return invoke ? createElement(ProjectRpcCtx.Provider, { value: invoke }, inner) : inner
}

export const useHasProject = () => !!(useSearch({ strict: false }) as { project?: string }).project

export const usePutTargetInUrl = (target: TargetRef | undefined) => {
  const current = useUrlTarget()
  const hasProject = useHasProject()
  const navigate = useNavigate()
  const wanted = target ? formatTarget(target) : undefined
  const have = current ? formatTarget(current) : undefined
  useEffect(() => {
    if (hasProject && wanted && wanted !== have) navigate({ to: '.', search: ((prev: object) => ({ ...prev, target: wanted })) as never, replace: true })
  }, [hasProject, wanted, have])
}

export function LocalProjectTargetProvider({ children }: { children: ReactNode }) {
  usePutTargetInUrl(DEFAULT_TARGET)
  const key = useProjectKey()
  const invoke = useContext(ProjectRpcCtx)
  const value = useMemo<ProjectTarget>(() => ({ kind: 'workspace', name: LOCAL_WORKSPACE, readOnly: false, rpc: bindRpc(invoke, key) }), [invoke, key])
  return createElement(ProjectTargetProvider, { value, children })
}

export class ReadOnlyTargetError extends Error {
  status = 403
  constructor(rpcName: string, target: string) {
    super(`${rpcName} changes things, and ${target} is view only`)
    this.name = 'ReadOnlyTargetError'
  }
}

const READ_VERB = /^(get|list|read|search|find|count|describe|preview|load|query|fetch|has|is|check|explain|show|stats|status|meta|all|summary|health|ping|whoami|me|my|session)(?=[A-Z_\-.:]|$)/
export const isReadCall = (rpcName: string) => READ_VERB.test(rpcName.split(':').pop() ?? rpcName)

export const readOnlyInvoke = (invoke: ProjectInvoke, target: string): ProjectInvoke => async (key, name, data) => {
  if (!isReadCall(name) && !name.startsWith('admin:')) throw new ReadOnlyTargetError(name, target)
  return invoke(key, name, data)
}

const LAST_TARGET = 'studio:last-target:'

export const lastTarget = (team: string, project: string): TargetRef | undefined => {
  try {
    return parseTarget(localStorage.getItem(`${LAST_TARGET}${team}/${project}`))
  } catch {
    return undefined
  }
}

export const rememberTarget = (team: string, project: string, target: TargetRef) => {
  try {
    localStorage.setItem(`${LAST_TARGET}${team}/${project}`, formatTarget(target))
  } catch {}
}
