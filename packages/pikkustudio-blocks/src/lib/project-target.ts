import { useSearch } from '@tanstack/react-router'
import type { ReactNode } from 'react'

export type ProjectTargetKind = 'workspace' | 'stage'
export type ProjectTarget = { kind: ProjectTargetKind; name: string; readOnly: boolean }

export const LOCAL_WORKSPACE = 'local'
export const TARGET_KINDS: readonly ProjectTargetKind[] = ['workspace', 'stage']

export const isTargetKind = (v: unknown): v is ProjectTargetKind => v === 'workspace' || v === 'stage'

export const targetOf = (kind: ProjectTargetKind, name: string): ProjectTarget => ({ kind, name, readOnly: kind === 'stage' })

export const formatTarget = (t: { kind: ProjectTargetKind; name: string }) => `${t.kind}/${t.name}`

export const parseTarget = (v: unknown): ProjectTarget | undefined => {
  if (typeof v !== 'string') return undefined
  const [kind, ...rest] = v.replace(/^"(.*)"$/, '$1').split('/')
  const name = rest.join('/')
  return isTargetKind(kind) && name ? targetOf(kind, name) : undefined
}

export const DEFAULT_TARGET: ProjectTarget = targetOf('workspace', LOCAL_WORKSPACE)

export const useProjectTarget = (): ProjectTarget =>
  parseTarget((useSearch({ strict: false }) as { target?: string }).target) ?? DEFAULT_TARGET

export const useHasProjectTarget = () => parseTarget((useSearch({ strict: false }) as { target?: string }).target) !== undefined

export const useCanEdit = () => !useProjectTarget().readOnly

export const ReadOnlyGate = ({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) => (useCanEdit() ? children : fallback)

const LAST_TARGET = 'studio:last-target:'

export const lastTarget = (team: string, project: string): ProjectTarget | undefined => {
  try {
    return parseTarget(localStorage.getItem(`${LAST_TARGET}${team}/${project}`))
  } catch {
    return undefined
  }
}

export const rememberTarget = (team: string, project: string, target: ProjectTarget) => {
  try {
    localStorage.setItem(`${LAST_TARGET}${team}/${project}`, formatTarget(target))
  } catch {}
}
