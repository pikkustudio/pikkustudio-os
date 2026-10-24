import { useParams, useSearch } from '@tanstack/react-router'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { STUDIO_LOCAL } from '@/lib/env'
import { LOCAL_WORKSPACE, useUrlTarget, type TargetRef } from './project-target'
import { createAddonRpc } from './addon-rpc'

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

type ListedProject = { key: string; slug: string; owner?: string; name: string; source?: string | null; sourceId?: string | null }
type ProjectList = { projects: ListedProject[] }

// The web build has no Studio on this computer: the projects are the caller's cloud ones, which the controlplane lists
// in Studio's shape (cloud:teamProjects, every team's when no team is given). Asked as `cloud`, whatever screen asks.
type CloudProjectsMap = {
  teamProjects: { input: { team?: string }; output: { projects: (Omit<ListedProject, 'source' | 'sourceId'> & { cloudProjectId: string | null })[] } }
}
const cloudProjects = createAddonRpc<CloudProjectsMap>('cloud')
const fromCloud = (d: CloudProjectsMap['teamProjects']['output']): ProjectList => ({
  projects: d.projects.map(({ cloudProjectId, ...p }) => ({ ...p, source: cloudProjectId ? 'cloud' : null, sourceId: cloudProjectId })),
})

/** The projects this Studio lists, through `select`: studio:listProjects, or on the web the caller's cloud projects. */
const useProjectList = <T,>(enabled: boolean, select: (d: ProjectList) => T) =>
  STUDIO_LOCAL
    ? (usePikkuQuery('studio:listProjects', {}, { enabled, select } as never) as unknown as { data?: T; isSuccess: boolean })
    : (cloudProjects.useQuery('teamProjects', {}, { enabled, select: ((d: CloudProjectsMap['teamProjects']['output']) => select(fromCloud(d))) as never }) as unknown as {
        data?: T
        isSuccess: boolean
      })

const matches = (p: ListedProject, slug: string) => `${p.owner}/${p.slug}` === slug || p.slug === slug || p.key === slug

export const useProjectKey = () => {
  const slug = useProjectSlug()
  const target = useUrlTarget()
  const found = useProjectList(!!slug, (d) => {
    const p = d.projects.find((p) => matches(p, slug))
    return p ? sourceKey(p, target) : ''
  })
  return found.data ?? ''
}

export const useProjectName = (): I18nString => {
  const slug = useProjectSlug()
  const found = useProjectList(!!slug, (d) => d.projects.find((p) => matches(p, slug))?.name ?? '')
  const name = found.data
  return name ? asI18n(name) : m.project__name_fallback()
}

export const useProjectMissing = () => {
  const slug = useProjectSlug()
  const found = useProjectList(!!slug, (d) => d.projects.some((p) => matches(p, slug)))
  return !!slug && found.isSuccess && found.data === false
}
