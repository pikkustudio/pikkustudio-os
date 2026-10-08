import { useParams, useSearch } from '@tanstack/react-router'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'

export const useProjectSlug = () => {
  const { project } = useSearch({ strict: false })
  const { key } = useParams({ strict: false }) as { key?: string }
  return project ?? key ?? ''
}

export const useProjectKey = () => {
  const slug = useProjectSlug()
  const found = usePikkuQuery('studio:listProjects', {}, {
    enabled: !!slug,
    select: (d: { projects: { key: string; slug: string; owner?: string }[] }) => d.projects.find((p) => `${p.owner}/${p.slug}` === slug || p.slug === slug || p.key === slug)?.key ?? '',
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
