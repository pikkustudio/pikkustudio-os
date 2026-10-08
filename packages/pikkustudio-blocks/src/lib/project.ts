import { useSearch } from '@tanstack/react-router'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'

export const useProjectSlug = () => {
  const { project } = useSearch({ strict: false })
  return project ?? ''
}

export const useProjectKey = () => {
  const slug = useProjectSlug()
  const found = usePikkuQuery('studio:listProjects', {}, {
    enabled: !!slug,
    select: (d: { projects: { key: string; slug: string; owner?: string }[] }) => d.projects.find((p) => `${p.owner}/${p.slug}` === slug || p.slug === slug || p.key === slug)?.key ?? '',
  } as never)
  return (found.data as string | undefined) ?? ''
}

export const useProjectName = () => {
  const slug = useProjectSlug()
  const found = usePikkuQuery('studio:listProjects', {}, {
    enabled: !!slug,
    select: (d: { projects: { key: string; slug: string; owner?: string; name: string }[] }) => d.projects.find((p) => `${p.owner}/${p.slug}` === slug || p.slug === slug || p.key === slug)?.name ?? '',
  } as never)
  return (found.data as string | undefined) || 'Your project'
}

export const useProjectMissing = () => {
  const slug = useProjectSlug()
  const found = usePikkuQuery('studio:listProjects', {}, {
    enabled: !!slug,
    select: (d: { projects: { key: string; slug: string; owner?: string }[] }) => d.projects.some((p) => `${p.owner}/${p.slug}` === slug || p.slug === slug || p.key === slug),
  } as never)
  return !!slug && found.isSuccess && (found.data as unknown) === false
}
