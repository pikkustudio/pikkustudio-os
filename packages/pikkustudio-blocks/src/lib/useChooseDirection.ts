import { m } from '@/i18n/messages'
import { useNavigate } from '@tanstack/react-router'
import { usePikkuMutation } from '@project/functions-sdk/pikku/api.gen'
import { useProjectKey } from './project'
import { useContext } from 'react'
import { ShellCtx } from './shell'
import type { Artifact } from '../types/artifacts'

export function useChooseDirection() {
  const key = useProjectKey()
  const navigate = useNavigate()
  const { pikkuSays } = useContext(ShellCtx)
  const choose = usePikkuMutation('studio:chooseDirection', {
    onSuccess: () => void navigate({ to: '/design' as never, search: true as never }),
    onError: (error: Error) => pikkuSays(m.choose_direction__save_failed({ reason: error.message })),
  } as never)
  return (d: Artifact) => choose.mutate({ key, artifactId: d.id } as never)
}
