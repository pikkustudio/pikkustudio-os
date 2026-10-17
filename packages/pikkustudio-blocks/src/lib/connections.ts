import { useContext } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ProjectAgentApiCtx } from './chat'
import { useProjectQuery } from './projectRpc'
import type { AccountsPage } from './accounts'

type CredentialMeta = { name?: string; displayName?: string; description?: string; type?: 'singleton' | 'wire'; oauth2?: unknown; schema?: unknown; docsUrl?: string }

export type Connection = {
  name: string
  label: string
  about?: string
  perPerson: boolean
  signIn: boolean
  fields: { id: string; label: string }[]
  docsUrl?: string
}

export type ConnectedPerson = { userId: string; name?: string }

const nice = (s: string) => s.replace(/[-_.]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())

const fieldsOf = (schema: unknown): Connection['fields'] => {
  const props = (schema as { properties?: Record<string, { title?: string }> } | undefined)?.properties
  if (!props || typeof props !== 'object') return []
  return Object.entries(props).map(([id, p]) => ({ id, label: p?.title || nice(id) }))
}

export function useConnections(key: string) {
  const meta = useProjectQuery<{ credentialsMeta?: Record<string, CredentialMeta> }>(key, 'console:getAllMeta', {})
  const all: Connection[] = Object.entries(meta.data?.credentialsMeta ?? {})
    .map(([name, c]) => ({
      name,
      label: c.displayName || nice(name),
      about: c.description,
      perPerson: c.type === 'wire',
      signIn: !!c.oauth2,
      fields: fieldsOf(c.schema),
      docsUrl: c.docsUrl,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
  const shared = all.filter((c) => !c.perPerson)
  const own = all.filter((c) => c.perPerson)
  const status = useProjectQuery<{ statuses: Record<string, boolean> }>(key, 'admin:credentialStatus', { names: shared.map((c) => c.name) }, { enabled: shared.length > 0 })
  const users = useProjectQuery<{ users: { userId: string; credentials: Record<string, boolean> }[] }>(key, 'admin:credentialListUsers', undefined, { enabled: own.length > 0 })
  const people = useProjectQuery<AccountsPage>(key, 'admin:listUsers', { limit: 200, offset: 0 }, { enabled: own.length > 0, optional: true })
  const names = new Map((people.data?.users ?? []).map((u) => [u.id, u.name?.trim() || u.email]))
  const connectedTo = (name: string): ConnectedPerson[] =>
    (users.data?.users ?? []).filter((u) => u.credentials[name]).map((u) => ({ userId: u.userId, name: names.get(u.userId) }))
  const isConnected = (name: string) => (status.data ? status.data.statuses[name] === true : undefined)
  return { meta, status, users, shared, own, isConnected, connectedTo }
}

export function useConnect(key: string) {
  const api = useContext(ProjectAgentApiCtx)(key)
  const client = useQueryClient()
  const refresh = () => {
    void client.invalidateQueries({ queryKey: ['project', key, 'admin:credentialStatus'] })
    void client.invalidateQueries({ queryKey: ['project', key, 'admin:credentialListUsers'] })
  }
  const connect = (name: string) => {
    const popup = window.open(`${api.replace(/\/rpc\/agent$/, '')}/credentials/${encodeURIComponent(name)}/connect`, 'oauth-connect', 'width=600,height=700')
    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer)
        refresh()
      }
    }, 500)
  }
  return { connect, refresh }
}
