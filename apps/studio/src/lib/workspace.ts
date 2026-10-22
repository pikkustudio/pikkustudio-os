import { createWorkspaceRouter } from '@pikkustudio/blocks/lib/workspace-route'
import { apiUrl } from '@/lib/env'
import { localeFetch } from '@/lib/locale-fetch'

/**
 * The web build's way to a cloud project's workspace (no Studio backend on this computer passes its calls on). Where
 * the workspace is comes from cloud:workspaceLink, the call the desktop's cloud source makes for the same thing.
 */
export const workspaces = createWorkspaceRouter({
  fetch: localeFetch,
  link: async (key) => {
    const rpcName = 'cloud:workspaceLink'
    const res = await localeFetch(`${apiUrl()}/rpc/${encodeURIComponent(rpcName)}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rpcName, data: { key } }),
    })
    const body = await res.json().catch(() => null)
    if (!res.ok) throw Object.assign(new Error(body?.message ?? body?.error ?? res.statusText), { status: res.status, ...(typeof body?.name === 'string' ? { name: body.name } : {}) })
    return body as { state: string; url: string }
  },
})
