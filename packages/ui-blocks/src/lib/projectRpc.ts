import { createContext, useContext } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ProjectTargetContext } from './project-target'

export type ProjectInvoke = (key: string, name: string, data?: unknown) => Promise<any>

export const ProjectRpcCtx = createContext<ProjectInvoke>(async (_key, name) => {
  throw new Error(`No project transport for ${name}`)
})

const IDLE_MS = 30_000

export function useProjectQuery<T>(key: string, name: string, data?: unknown, options?: { refetchInterval?: number; enabled?: boolean; optional?: boolean; handlesErrors?: boolean }) {
  const invoke = useContext(ProjectRpcCtx)
  const { kind, name: at } = useContext(ProjectTargetContext)
  return useQuery<T>({
    enabled: !!key && options?.enabled !== false,
    queryKey: ['project', key, name, data ?? null, `${kind}/${at}`],
    queryFn: () => invoke(key, name, data),
    // A cloud workspace that is off (409) or still starting (503) is checked on far less often.
    refetchInterval: (query) => {
      const status = (query.state.error as { status?: number } | null)?.status
      return options?.refetchInterval && (status === 409 || status === 503) ? Math.max(options.refetchInterval, IDLE_MS) : options?.refetchInterval
    },
    retry: false,
    ...(options?.handlesErrors ? { meta: { handlesErrors: true } } : {}),
    ...(options?.optional ? { retryOnMount: false, refetchOnWindowFocus: false, staleTime: 300_000 } : {}),
  })
}

export function useProjectAction<I, T = unknown>(key: string, name: string, invalidate: string[] = []) {
  const invoke = useContext(ProjectRpcCtx)
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: I) => invoke(key, name, input) as Promise<T>,
    onSuccess: () => {
      for (const n of invalidate) client.invalidateQueries({ queryKey: ['project', key, n] })
    },
  })
}
