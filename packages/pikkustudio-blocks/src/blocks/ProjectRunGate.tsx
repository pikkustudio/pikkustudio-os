import type { I18nNode } from '@pikku/react'
import { useState } from 'react'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useProjectKey } from '../lib/project'
import { AppNotRunning } from './AppNotRunning'
import { useTeamProjects } from './TeamProjects'

type LiveApp = { slug: string; state: 'starting' | 'ready' | 'failed' }

const label = (slug: string) => slug.charAt(0).toUpperCase() + slug.slice(1).replace(/[-_]+/g, ' ')

export function ProjectRunGate({ children }: { children: I18nNode }) {
  const key = useProjectKey()
  const [wanted, setWanted] = useState(false)
  const project = useTeamProjects().data?.find((p) => p.key === key)
  const apps = usePikkuQuery('studio:projectApps', { key }, {
    enabled: !!key && project?.location !== 'cloud',
    refetchInterval: (query: { state: { data?: LiveApp[] } }) => ((query.state.data ?? []).length > 0 && (query.state.data ?? []).every((a) => a.state === 'ready') ? 15000 : 2000),
  } as never)
  const start = usePikkuMutation('studio:openProject', { onSuccess: () => apps.refetch() })
  const restart = usePikkuMutation('studio:closeProject', { onSuccess: () => start.mutate({ key }) })

  if (!key || !project || project.location === 'cloud') return <>{children}</>
  const list = (apps.data as LiveApp[] | undefined) ?? []
  const broken = list.find((a) => a.state === 'failed')
  const name = broken ? label(broken.slug) : list[0] ? label(list[0].slug) : undefined
  if (apps.isPending) return <AppNotRunning state="starting" name={name} onStart={() => undefined} />
  if (broken || start.isError) return <AppNotRunning state="failed" name={name} onStart={() => restart.mutate({ key })} starting={restart.isPending || start.isPending} />
  if (list.length === 0) return <AppNotRunning state="off" onStart={() => { setWanted(true); start.mutate({ key }) }} starting={wanted && start.isPending} />
  if (list.some((a) => a.state !== 'ready')) return <AppNotRunning state="starting" name={name} onStart={() => undefined} />
  return <>{children}</>
}
