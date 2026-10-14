import { useState } from 'react'
import { m } from '@/i18n/messages'
import { useSearch } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { usePikkuMutation } from '@project/functions-sdk/pikku/api.gen'
import { ActionNotice } from '../blocks/ActionNotice'
import { useProjectName, useProjectSlug } from '../lib/project'
import { homeStates, projectHomes, type HomeState } from '../mocks/projectHome'
import { useTeamProjects } from '../blocks/TeamProjects'
import { OverviewScreen } from './OverviewScreen'
import { ProjectLandingScreen } from './ProjectLandingScreen'

export function ProjectHomeGate() {
  const slug = useProjectSlug()
  const name = useProjectName()
  const { state } = useSearch({ strict: false }) as { state?: HomeState }
  const client = useQueryClient()
  const clone = usePikkuMutation('studio:cloneProject')
  const link = usePikkuMutation('studio:workspaceLink')
  const [waking, setWaking] = useState(false)
  const [awake, setAwake] = useState(false)
  const [wakeError, setWakeError] = useState<unknown>(null)
  const project = useTeamProjects().data?.find((p) => p.slug === slug || p.key === slug)
  if (!project || project.location !== 'cloud' || awake) return <OverviewScreen />
  const current = homeStates.some(([id]) => id === state) ? (state as HomeState) : 'new'
  const copy = () => {
    if (!project.fabricProjectId || clone.isPending) return
    clone.mutate({ fabricProjectId: project.fabricProjectId } as never, { onSuccess: () => client.invalidateQueries({ queryKey: ['studio:listProjects'] }) })
  }
  const wake = async () => {
    if (waking) return
    setWaking(true)
    setWakeError(null)
    try {
      for (;;) {
        const { state } = (await link.mutateAsync({ key: project.key } as never)) as { state: 'starting' | 'ready' }
        if (state === 'ready') break
        await new Promise((resolve) => setTimeout(resolve, 3000))
      }
      await client.invalidateQueries({ queryKey: ['studio:listProjects'] })
      setAwake(true)
    } catch (error) {
      setWakeError(error)
    } finally {
      setWaking(false)
    }
  }
  const onAct = (way: string) => {
    if (way === 'local') copy()
    if (way === 'cloud') wake()
  }
  return (
    <ProjectLandingScreen
      home={{ ...projectHomes[current], name }}
      onAct={onAct}
      busy={clone.isPending ? 'local' : waking ? 'cloud' : null}
      notice={
        wakeError && !waking ? (
          <ActionNotice error={wakeError} what={m.project_home_gate__the_project()} onRetry={wake} retrying={waking} />
        ) : clone.isError && !clone.isPending ? (
          <ActionNotice error={clone.error} what={m.project_home_gate__the_project()} onRetry={copy} retrying={clone.isPending} />
        ) : undefined
      }
    />
  )
}
