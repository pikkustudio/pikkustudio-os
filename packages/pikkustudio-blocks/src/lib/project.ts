import { useParams, useSearch } from '@tanstack/react-router'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { LOCAL_WORKSPACE, useUrlTarget, type TargetRef } from './project-target'

export const useProjectSlug = () => {
  const { project } = useSearch({ strict: false })
  const { key } = useParams({ strict: false }) as { key?: string }
  return project ?? key ?? ''
}

// A project a contributed source holds is keyed `<source>:<id>`, or `<source>:<id>@<workspace>` for one of its
// workspaces there; the id is the source's own (`sourceId`). A project on this computer keeps its own key, with no `:`.
type Sourced = { key: string; source?: string | null; sourceId?: string | null }

/** The source a key names, with the project's id and workspace there; null for a project on this computer. */
export const sourceOf = (key: string): { source: string; id: string; workspace?: string } | null => {
  const at = key.indexOf(':')
  if (at <= 0) return null
  const [id, workspace] = key.slice(at + 1).split('@')
  return id ? { source: key.slice(0, at), id, workspace: workspace || undefined } : null
}

/** The source's id for a source key; a key on this computer is its own id. */
export const sourceIdOf = (key: string) => sourceOf(key)?.id ?? key

/** Whether a key, on this computer or in the project's source (any of its workspaces), names this project. */
export const isKeyOf = (p: Sourced, key: string) => {
  if (p.key === key) return true
  const ref = sourceOf(key)
  return !!ref && !!p.source && ref.source === p.source && ref.id === p.sourceId
}

/** The key for a project at a target: one of its source's workspaces, or the project itself. */
export const sourceKey = (p: Sourced, target: TargetRef | undefined) =>
  target?.kind === 'workspace' && target.name !== LOCAL_WORKSPACE && p.source && p.sourceId ? `${p.source}:${p.sourceId}@${target.name}` : p.key

export const useProjectKey = () => {
  const slug = useProjectSlug()
  const target = useUrlTarget()
  const found = usePikkuQuery('studio:listProjects', {}, {
    enabled: !!slug,
    select: (d: { projects: { key: string; slug: string; owner?: string; source?: string | null; sourceId?: string | null }[] }) => {
      const p = d.projects.find((p) => `${p.owner}/${p.slug}` === slug || p.slug === slug || p.key === slug)
      return p ? sourceKey(p, target) : ''
    },
  } as never)
  return (found.data as string | undefined) ?? ''
}

export const useProjectName = (): I18nString => {
  const slug = useProjectSlug()
  const found = usePikkuQuery('studio:listProjects', {}, {
    enabled: !!slug,
    select: (d: { projects: { key: string; slug: string; owner?: string; name: string }[] }) => d.projects.find((p) => `${p.owner}/${p.slug}` === slug || p.slug === slug || p.key === slug)?.name ?? '',
  } as never)
  const name = found.data as string | undefined
  return name ? asI18n(name) : m.project__name_fallback()
}

export const useProjectMissing = () => {
  const slug = useProjectSlug()
  const found = usePikkuQuery('studio:listProjects', {}, {
    enabled: !!slug,
    select: (d: { projects: { key: string; slug: string; owner?: string }[] }) => d.projects.some((p) => `${p.owner}/${p.slug}` === slug || p.slug === slug || p.key === slug),
  } as never)
  return !!slug && found.isSuccess && (found.data as unknown) === false
}
