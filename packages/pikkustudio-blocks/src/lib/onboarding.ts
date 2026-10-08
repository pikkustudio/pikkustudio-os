import { useQueryClient } from '@tanstack/react-query'
import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'

export type Account = {
  signIn: string | null
  name: string | null
  about: string | null
  ai: unknown
  signedIn: boolean
  apiUrl: string
  consoleUrl: string
}

export type AiOptions = {
  keys: { id: string; name: string; envVar: string; baseUrl: string; model: string }[]
  subscriptions: { id: string; name: string; piLogin: string }[]
}

export type RecentProject = { key: string; name: string; colors: [string, string] }

const palette: [string, string][] = [
  ['#00767E', '#2FD3C6'],
  ['#FF6F61', '#FFC83D'],
]

export const useAccount = () => usePikkuQuery('studio:account', {}) as UseQueryResult<Account>
export const useAiOptions = () => usePikkuQuery('studio:aiOptions', {}) as UseQueryResult<AiOptions>
export const useRecentProjects = () => {
  const signedIn = !!useAccount().data?.signIn
  return usePikkuQuery('studio:listProjects', {}, {
    enabled: signedIn,
    select: (d: { projects: { key: string; name: string }[] }): RecentProject[] =>
      d.projects.slice(0, 2).map((p, i) => ({ key: p.key, name: p.name, colors: palette[i] })),
  } as never) as unknown as UseQueryResult<RecentProject[]>
}
export const useSignOut = () => {
  const client = useQueryClient()
  const mutation = usePikkuMutation('studio:signOut')
  return {
    ...mutation,
    mutate: (input: object) => mutation.mutate(input as never, { onSuccess: () => client.invalidateQueries() }),
  }
}
export const useSetProfile = () => usePikkuMutation('studio:setProfile')
export const useUseLocally = () => usePikkuMutation('studio:useLocally')
export const useSetAi = () => usePikkuMutation('studio:setAi')

export type ProjectRun = {
  status: 'running' | 'suspended' | 'completed' | 'failed' | 'cancelled'
  steps: { name: string; status: string }[]
  key?: string
  error?: string
}

const finished = (status?: string) => status === 'completed' || status === 'failed' || status === 'cancelled'

export const useStartProjectRun = () => usePikkuMutation('studio:startProjectRun' as never) as unknown as UseMutationResult<{ runId: string }, Error, { name: string; idea: string; key?: string; surfaces?: string[]; devices?: string[]; uploadId?: string }>
export const useAttachFile = () => usePikkuMutation('studio:attachFile' as never) as unknown as UseMutationResult<{ name: string }, Error, { uploadId: string; name: string; data: string }>
export const useImportProject = () => usePikkuMutation('studio:importProject' as never) as unknown as UseMutationResult<{ key: string; slug: string; owner?: string; name: string }, Error, { url: string; name?: string }>
export const newProjectName = () => crypto.randomUUID().slice(0, 6)
export const useProjectRun = (runId?: string) =>
  usePikkuQuery('studio:projectRun' as never, { runId: runId ?? '' } as never, {
    enabled: !!runId,
    refetchInterval: (query: { state: { data?: { status?: string } } }) => (finished(query.state.data?.status) ? false : 1500),
  } as never) as unknown as UseQueryResult<ProjectRun>
