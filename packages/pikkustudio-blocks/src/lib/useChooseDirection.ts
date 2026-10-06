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
    onSuccess: () => void navigate({ to: '/build' as never, search: true as never }),
    onError: (error: Error) => pikkuSays(`I could not save that choice. ${error.message}`),
  } as never)
  return (d: Artifact) => choose.mutate({ key, artifactId: d.id } as never)
}
