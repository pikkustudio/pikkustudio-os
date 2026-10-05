import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { toWebRequest } from '@pikku/core/http'

const STUDIO_HEADER = 'x-pikku-studio'

export const ProjectProxyInput = z.looseObject({ key: z.string() })

export const projectProxy = pikkuSessionlessFunc({
  description: "Pass a request through to a running project's own server.",
  input: ProjectProxyInput,
  func: async ({ studioProjects, studioHooks }, { key }, { http }) => {
    const running = studioProjects.runningProject(key) ?? (await studioProjects.open(key).catch(() => null))
    if (!running) return Response.json({ error: 'That project is not open' }, { status: 404 })
    studioProjects.touch(key)
    const incoming = toWebRequest(http!.request!, `http://127.0.0.1:${running.port}`)
    const url = new URL(incoming.url)
    url.pathname = url.pathname.slice(`/p/${key}`.length) || '/'
    const headers = new Headers(incoming.headers)
    headers.set('host', `127.0.0.1:${running.port}`)
    headers.set(STUDIO_HEADER, running.token)
    headers.set('authorization', `Bearer ${running.token}`)
    try {
      const response = await fetch(url, {
        method: incoming.method,
        headers,
        body: incoming.body,
        redirect: 'manual',
        ...({ duplex: 'half' } as object),
      })
      return studioHooks.proxied(response)
    } catch (error) {
      return Response.json({ error: (error as Error).message }, { status: 502 })
    }
  },
})
