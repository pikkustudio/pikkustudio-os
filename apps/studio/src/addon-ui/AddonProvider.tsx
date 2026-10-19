import { useState, type ReactNode } from 'react'
import { PikkuProvider, createPikku } from '@pikku/react'
import { PikkuFetch } from '@project/functions-sdk/pikku/pikku-fetch.gen'
import { PikkuRPC } from '@project/functions-sdk/pikku/pikku-rpc.gen'
import { apiUrl } from '@/lib/env'
import { localeFetch } from '@/lib/locale-fetch'
import { ADDON_HEADER } from '@pikkustudio/blocks/lib/addon-rpc'

export { ADDON_HEADER }

export function AddonProvider({ addon, children }: { addon: string; children: ReactNode }) {
  const [pikku] = useState(() => {
    const client = createPikku(PikkuFetch, PikkuRPC, { serverUrl: apiUrl(), credentials: 'include', fetch: localeFetch })
    client.fetch.setHeader(ADDON_HEADER, addon)
    return client
  })
  return <PikkuProvider pikku={pikku}>{children}</PikkuProvider>
}
