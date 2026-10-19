import { useCallback } from 'react'
import { useMutation, useQuery, type UseMutationOptions, type UseQueryOptions } from '@tanstack/react-query'
import { usePikkuFetch } from '@pikku/react'

/** The header that names the addon a call is made for; the backend lets it reach only that addon's functions. */
export const ADDON_HEADER = 'x-pikku-addon'

/** An addon's own rpc map, as its `.pikku/addon/rpc/pikku-rpc-wirings-map.gen.d.ts` declares it. */
export type AddonRPCMap = { readonly [name: string]: { input: unknown; output: unknown } }

const retryUnlessClientError = (failureCount: number, error: Error) => {
  const status = (error as { status?: number }).status
  return !(status !== undefined && status >= 400 && status < 500) && failureCount < 3
}

/**
 * Calls to one addon's functions, typed by that addon's own rpc map. They go through the Studio backend's rpc route
 * as `<addon>:<name>` with the addon header, so addon UI never needs the app's generated client, nor any other API.
 *
 *   const cloud = createAddonRpc<RPCMap>('cloud')
 *   const plans = cloud.useQuery('listPlans', {})
 */
export const createAddonRpc = <Map extends AddonRPCMap>(addon: string) => {
  type Name = keyof Map & string
  type Invoke = <N extends Name>(name: N, data: Map[N]['input']) => Promise<Map[N]['output']>

  const useInvoke = (): Invoke => {
    const fetch = usePikkuFetch()
    return useCallback(
      ((name: string, data: unknown) => fetch.post(`/rpc/${encodeURIComponent(`${addon}:${name}`)}`, { rpcName: `${addon}:${name}`, data }, { headers: { [ADDON_HEADER]: addon } })) as Invoke,
      [fetch],
    )
  }

  const useAddonQuery = <N extends Name>(name: N, data: Map[N]['input'], options?: Omit<UseQueryOptions<Map[N]['output'], Error>, 'queryKey' | 'queryFn'>) => {
    const invoke = useInvoke()
    return useQuery<Map[N]['output'], Error>({
      queryKey: [`${addon}:${name}`, data],
      queryFn: () => invoke(name, data),
      retry: retryUnlessClientError,
      ...options,
    })
  }

  const useAddonMutation = <N extends Name>(name: N, options?: Omit<UseMutationOptions<Map[N]['output'], Error, Map[N]['input']>, 'mutationFn'>) => {
    const invoke = useInvoke()
    return useMutation<Map[N]['output'], Error, Map[N]['input']>({ mutationFn: (data) => invoke(name, data), ...options })
  }

  /** The query key a call is cached under, for invalidating it. */
  const queryKey = (name: Name, data?: unknown) => (data === undefined ? [`${addon}:${name}`] : [`${addon}:${name}`, data])

  return { addon, useInvoke, useQuery: useAddonQuery, useMutation: useAddonMutation, queryKey }
}
