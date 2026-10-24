import { useState, type ReactNode } from 'react'
import { PikkuProvider, createPikku } from '@pikku/react'
import { PikkuFetch } from '@project/functions-sdk/pikku/pikku-fetch.gen'
import { PikkuRPC } from '@project/functions-sdk/pikku/pikku-rpc.gen'
import { apiUrl } from '@/lib/env'
import { workspaceCall } from '@/lib/workspace'
import { localeFetch } from '@/lib/locale-fetch'
import { ADDON_HEADER } from '@pikkustudio/blocks/lib/addon-rpc'

export { ADDON_HEADER }

export function AddonProvider({ addon, children }: { addon: string; children: ReactNode }) {
  const [pikku] = useState(() => {
    const client = createPikku(PikkuFetch, PikkuRPC, { serverUrl: apiUrl(), credentials: 'include', fetch: localeFetch })
    client.fetch.setHeader(ADDON_HEADER, addon)
    // On the web a cloud project's calls go to its workspace, made as this addon (lib/workspace.ts).
    const invoke = client.rpc.invoke.bind(client.rpc) as (name: string, data?: unknown) => Promise<unknown>
    client.rpc.invoke = ((name: string, data: unknown) => workspaceCall(name, data, addon) ?? invoke(name, data)) as typeof client.rpc.invoke
    return client
  })
  return <PikkuProvider pikku={pikku}>{children}</PikkuProvider>
}
