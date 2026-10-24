import { afterEach, describe, expect, test } from 'bun:test'
import { directTransport } from './persona-transport'

const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
})

const stub = (routes: Record<string, { status: number; body?: unknown }>) => {
  const calls: string[] = []
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url}`
    calls.push(key)
    const hit = routes[key] ?? { status: 404 }
    return new Response(JSON.stringify(hit.body ?? {}), { status: hit.status })
  }) as typeof fetch
  return calls
}

describe('directTransport', () => {
  test('uses the virtual-user routes when the app has them', async () => {
    const calls = stub({
      'GET /api/auth/sign-in/virtual-users': { status: 200, body: { virtualUsers: [{ id: 'a', name: 'Ann', jobTitle: null }] } },
      'POST /api/auth/sign-in/switch-virtual-user': { status: 200 },
    })
    const t = directTransport()
    expect((await t.list()).actors?.[0].id).toBe('a')
    expect((await t.switchTo('a')).ok).toBe(true)
    expect(calls).toEqual(['GET /api/auth/sign-in/virtual-users', 'POST /api/auth/sign-in/switch-virtual-user'])
  })

  test('falls back to the persona routes of an older app', async () => {
    const calls = stub({
      'GET /api/auth/sign-in/personas': { status: 200, body: { actors: [{ id: 'v', name: 'Visitor', jobTitle: null }] } },
      'POST /api/auth/sign-in/persona': { status: 200 },
    })
    const t = directTransport()
    expect((await t.list()).actors?.[0].name).toBe('Visitor')
    expect((await t.switchTo('v')).ok).toBe(true)
    expect(calls[calls.length - 1]).toBe('POST /api/auth/sign-in/persona')
  })

  test('reports failure instead of throwing when the app is unreachable', async () => {
    globalThis.fetch = (async () => {
      throw new Error('down')
    }) as typeof fetch
    expect((await directTransport().list()).ok).toBe(false)
  })
})
