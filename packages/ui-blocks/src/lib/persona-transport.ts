export type Persona = { id: string; name: string; jobTitle: string | null }
export type PersonaReply = { ok: boolean; actors?: Persona[]; name?: string | null }

export type PersonaTransport = {
  list: () => Promise<PersonaReply>
  who: () => Promise<PersonaReply>
  switchTo: (id: string) => Promise<PersonaReply>
  signOut: () => Promise<PersonaReply>
}

let counter = 0

const askFrame = (type: string, extra: Record<string, unknown> = {}): Promise<PersonaReply> =>
  new Promise((resolve) => {
    const frame = document.querySelector<HTMLIFrameElement>('iframe[data-live-app]')
    if (!frame?.contentWindow) return resolve({ ok: false })
    const id = `persona-${++counter}`
    const done = (reply: PersonaReply) => {
      window.removeEventListener('message', onMessage)
      clearTimeout(timer)
      resolve(reply)
    }
    const onMessage = (event: MessageEvent) => {
      const data = event.data
      if (event.source === frame.contentWindow && data?.source === 'cloud-preview' && data.type === 'persona-result' && data.id === id) done(data)
    }
    const timer = setTimeout(() => done({ ok: false }), 1500)
    window.addEventListener('message', onMessage)
    frame.contentWindow.postMessage({ source: 'cloud-console', type, id, ...extra }, '*')
  })

export const frameTransport: PersonaTransport = {
  list: () => askFrame('persona-list'),
  who: () => askFrame('persona-who'),
  switchTo: (persona) => askFrame('persona-switch', { persona }),
  signOut: () => askFrame('persona-signout'),
}

type Dialect = 'virtual-users' | 'personas'

export const directTransport = (origin = ''): PersonaTransport => {
  const api = `${origin}/api/auth`
  let dialect: Dialect | null = null
  const json = (body: unknown) => ({ method: 'POST', credentials: 'include' as const, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const safe = async (run: () => Promise<PersonaReply>): Promise<PersonaReply> => {
    try {
      return await run()
    } catch {
      return { ok: false }
    }
  }
  const list = async (): Promise<PersonaReply> => {
    for (const next of dialect ? [dialect] : (['virtual-users', 'personas'] as const)) {
      const r = await fetch(`${api}/sign-in/${next}`, { credentials: 'include' })
      if (r.status === 404) continue
      dialect = next
      if (!r.ok) return { ok: false }
      const body = await r.json()
      return { ok: true, actors: (next === 'virtual-users' ? body.virtualUsers : body.actors) ?? [] }
    }
    return { ok: false }
  }
  return {
    list: () => safe(list),
    who: () =>
      safe(async () => {
        const r = await fetch(`${api}/get-session`, { credentials: 'include' })
        const body = r.ok ? await r.json() : null
        return { ok: r.ok, name: body?.user ? (body.user.name ?? '') : null }
      }),
    switchTo: (id) =>
      safe(async () => {
        if (!dialect) await list()
        const r = await fetch(`${api}/sign-in/${dialect === 'personas' ? 'persona' : 'switch-virtual-user'}`, json({ id }))
        return { ok: r.ok }
      }),
    signOut: () =>
      safe(async () => {
        const r = await fetch(`${api}/sign-out`, json({}))
        return { ok: r.ok }
      }),
  }
}
