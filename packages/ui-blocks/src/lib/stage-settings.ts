import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import type { StageSettings } from './projectSecrets'
import { useProjectTarget } from './project-target'

type Values = { values: { secretIds: string[]; settings: NonNullable<StageSettings['settings']> } | null }

/** Secrets and settings of the published copy the project target points at, from the host's stage source; null on a workspace. */
export function useStageSettings(key: string, settingIds: string[]): StageSettings | null {
  const target = useProjectTarget()
  const stage = target.kind === 'stage' ? target.name : ''
  const query = usePikkuQuery('studio:projectStageSettings', { key, stage, settingIds }, { enabled: !!key && !!stage } as never)
  const save = usePikkuMutation('studio:saveProjectStageValue')
  if (!stage) return null
  const values = (query.data as Values | undefined)?.values
  const saved = async (kind: 'secret' | 'setting', id: string, value: string) => {
    await save.mutateAsync({ key, stage, kind, id, value })
    await query.refetch()
  }
  return {
    secretIds: values?.secretIds,
    settings: values?.settings,
    error: query.error,
    retry: () => void query.refetch(),
    saveSecret: (id, value) => saved('secret', id, value),
    saveSetting: (id, value) => saved('setting', id, value),
  }
}
