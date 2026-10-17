import { useContext, useMemo } from 'react'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { ProjectRpcCtx, useProjectQuery } from './projectRpc'
import { ProjectTargetContext } from './project-target'

type SecretMeta = { name: string; displayName?: string; description?: string; secretId: string; optional?: boolean; oauth2?: unknown; docsUrl?: string }
type VariableMeta = { name: string; displayName?: string; description?: string; variableId: string; optional?: boolean; docsUrl?: string }
type CredentialMeta = { oauth2?: { tokenSecretId?: string } }
type Meta = { secretsMeta?: Record<string, SecretMeta>; variablesMeta?: Record<string, VariableMeta>; credentialsMeta?: Record<string, CredentialMeta> }

export type ProjectValue = { id: string; name: string; label: string; about?: string; optional: boolean; docsUrl?: string }
export type ProjectSecret = ProjectValue & { connected: boolean }

const byLabel = (a: ProjectValue, b: ProjectValue) => a.label.localeCompare(b.label)

/** The secrets and settings the project's code declares. Same query, and so the same cache entry, as the other screens that read the meta. */
export function useProjectSecretsMeta(key: string) {
  const query = useProjectQuery<Meta>(key, 'console:getAllMeta', {})
  const data = useMemo(() => {
    if (!query.data) return undefined
    const tokens = new Set(Object.values(query.data.credentialsMeta ?? {}).map((c) => c.oauth2?.tokenSecretId).filter(Boolean))
    const secrets: ProjectSecret[] = Object.values(query.data.secretsMeta ?? {})
      .map((s) => ({ id: s.secretId, name: s.name, label: s.displayName || s.name, about: s.description, optional: !!s.optional, docsUrl: s.docsUrl, connected: !!s.oauth2 || tokens.has(s.secretId) }))
      .sort(byLabel)
    const settings: ProjectValue[] = Object.values(query.data.variablesMeta ?? {})
      .map((v) => ({ id: v.variableId, name: v.name, label: v.displayName || v.name, about: v.description, optional: !!v.optional, docsUrl: v.docsUrl }))
      .sort(byLabel)
    return { secrets, settings }
  }, [query.data])
  return { query, data }
}

/** Which secrets have a value where the project runs on this computer or in a workspace. */
export function useSecretsSet(key: string, ids: string[], enabled: boolean) {
  const invoke = useContext(ProjectRpcCtx)
  const { kind, name: at } = useContext(ProjectTargetContext)
  return useQueries({
    queries: ids.map((secretId) => ({
      enabled: enabled && !!key,
      queryKey: ['project', key, 'console:secretHas', { secretId }, `${kind}/${at}`],
      queryFn: () => invoke(key, 'console:secretHas', { secretId }) as Promise<{ exists: boolean }>,
      retry: false,
    })),
    combine: (results) => ({
      set: results.every((r) => r.data) ? new Set(ids.filter((_, i) => results[i]!.data!.exists)) : undefined,
      error: results.find((r) => r.error)?.error ?? null,
      retry: () => results.forEach((r) => r.refetch()),
    }),
  })
}

const asText = (value: unknown): string | null => (value == null ? null : typeof value === 'string' ? value : JSON.stringify(value))

const missingCall = (error: unknown) => (error as { status?: number } | null)?.status === 404

/**
 * Each setting's value where the project runs on this computer or in a workspace, read and saved
 * through the project's own variables. A project on an older Pikku has no such calls: `supported`
 * is then false and the settings stay read-only here.
 */
export function useLocalSettings(key: string, ids: string[], enabled: boolean) {
  const invoke = useContext(ProjectRpcCtx)
  const client = useQueryClient()
  const { kind, name: at } = useContext(ProjectTargetContext)
  const read = useQueries({
    queries: ids.map((variableId) => ({
      enabled: enabled && !!key,
      queryKey: ['project', key, 'console:variableGet', { variableId }, `${kind}/${at}`],
      queryFn: () => invoke(key, 'console:variableGet', { variableId }) as Promise<{ exists: boolean; value: unknown }>,
      retry: false,
    })),
    combine: (results) => {
      const error = results.find((r) => r.error)?.error ?? null
      return {
        settings: results.every((r) => r.data) ? Object.fromEntries(ids.map((id, i) => [id, { exists: results[i]!.data!.exists, value: asText(results[i]!.data!.value) }])) : undefined,
        supported: !results.some((r) => missingCall(r.error)),
        error: missingCall(error) ? null : error,
        retry: () => results.forEach((r) => r.refetch()),
      }
    },
  })
  const save = async (variableId: string, value: string) => {
    await invoke(key, 'console:variableSet', { variableId, value })
    await client.invalidateQueries({ queryKey: ['project', key, 'console:variableGet'] })
  }
  return { ...read, save }
}

/** A published copy of the project. Its secrets are sealed in this browser to that copy's own key before they are sent. */
export type StageSettings = {
  /** Ids of the secrets that copy has a value for; undefined while loading. */
  secretIds: string[] | undefined
  /** Each setting's value on that copy, by id; undefined while loading. */
  settings: Record<string, { exists: boolean; value: string | null }> | undefined
  error: unknown
  retry: () => void
  saveSecret: (secretId: string, value: string) => Promise<void>
  saveSetting: (variableId: string, value: string) => Promise<void>
}
