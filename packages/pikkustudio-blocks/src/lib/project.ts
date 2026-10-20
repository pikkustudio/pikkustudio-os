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

// A project the account host holds online is keyed `online:<id>`, or `online:<id>@<workspace>` for one of its online
// workspaces; the id is the account's own (`cloudProjectId`). A project on this computer keeps its own key.
const ONLINE_KEY = 'online:'

export const isOnlineKey = (key: string) => key.startsWith(ONLINE_KEY)

/** The account's id for an online key; a key on this computer is its own id. */
export const hostProjectId = (key: string) => (isOnlineKey(key) ? key.slice(ONLINE_KEY.length).split('@')[0]! : key)

/** Whether a key, on this computer or online (any of its workspaces), names this project. */
export const isKeyOf = (p: { key: string; cloudProjectId?: string | null }, key: string) =>
  p.key === key || (!!p.cloudProjectId && (key === `${ONLINE_KEY}${p.cloudProjectId}` || key.startsWith(`${ONLINE_KEY}${p.cloudProjectId}@`)))

export const onlineKey = (p: { key: string; cloudProjectId?: string | null }, target: TargetRef | undefined) =>
  target?.kind === 'workspace' && target.name !== LOCAL_WORKSPACE && p.cloudProjectId ? `${ONLINE_KEY}${p.cloudProjectId}@${target.name}` : p.key

export const useProjectKey = () => {
  const slug = useProjectSlug()
  const target = useUrlTarget()
  const found = usePikkuQuery('studio:listProjects', {}, {
    enabled: !!slug,
    select: (d: { projects: { key: string; slug: string; owner?: string; cloudProjectId?: string | null }[] }) => {
      const p = d.projects.find((p) => `${p.owner}/${p.slug}` === slug || p.slug === slug || p.key === slug)
      return p ? onlineKey(p, target) : ''
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
