import { createContext, useContext } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type ProjectInvoke = (key: string, name: string, data?: unknown) => Promise<any>

export const ProjectRpcCtx = createContext<ProjectInvoke>(async (_key, name) => {
  throw new Error(`No project transport for ${name}`)
})

export function useProjectQuery<T>(key: string, name: string, data?: unknown, options?: { refetchInterval?: number }) {
  const invoke = useContext(ProjectRpcCtx)
  return useQuery<T>({
    enabled: !!key,
    queryKey: ['project', key, name, data ?? null],
    queryFn: () => invoke(key, name, data),
    refetchInterval: options?.refetchInterval,
    retry: false,
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
