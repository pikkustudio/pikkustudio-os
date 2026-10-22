import { sourceKeyOf } from '@pikkustudio/blocks/lib/workspace-route'
import { STUDIO_LOCAL, backendBase } from '@/lib/env'
import { workspaces } from '@/lib/workspace'

export async function projectInvoke<T>(projectKey: string, name: string, data?: unknown): Promise<T> {
  // On the web a cloud project's server is reached through its workspace; on the desktop the backend passes it on.
  if (!STUDIO_LOCAL && sourceKeyOf(projectKey)) return workspaces.project<T>(projectKey, name, data)
  const init = {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ rpcName: name, data }),
  }
  const res = await fetch(`${backendBase()}/p/${projectKey}/rpc/${name}`, { ...init, credentials: 'include' })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const error = Object.assign(new Error(body?.message ?? body?.error ?? res.statusText), { status: res.status })
    if (typeof body?.name === 'string') error.name = body.name
    throw error
  }
  return body as T
}
