import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addonRoles } from '#pikku/screens/pikku-addon-roles.gen.js'
import { addonUiCall } from './addon-ui.middleware.js'

const run = async (headers: Record<string, string>, session: { userId: string; scopes?: string[] } | undefined) => {
  let current = session
  await addonUiCall({} as never, {
    http: { request: { header: (name: string) => headers[name.toLowerCase()] } },
    getSession: () => current,
    setSession: (next: typeof session) => {
      current = next
    },
  } as never, async () => {})
  return current
}

test('on this computer the owner is capped to the addon role, not left with nothing', async () => {
  addonRoles.invoices = ['invoices:read']
  const session = await run({ 'x-pikku-addon': 'invoices', host: 'localhost:4741' }, { userId: 'owner', scopes: [] })
  assert.deepEqual(session?.scopes, ['invoices:read'])
})

test('a remote viewer keeps only what they hold, capped to the role', async () => {
  addonRoles.invoices = ['invoices:read']
  const session = await run({ 'x-pikku-addon': 'invoices', host: 'studio.example.com' }, { userId: 'u', scopes: ['invoices:*', 'admin'] })
  assert.deepEqual(session?.scopes, ['invoices:read'])
})

test('a remote viewer with no scopes gets nothing, not the owner treatment', async () => {
  addonRoles.invoices = ['invoices:read']
  const session = await run({ 'x-pikku-addon': 'invoices', host: 'studio.example.com' }, { userId: 'u', scopes: [] })
  assert.deepEqual(session?.scopes, [])
})

test('a proxied request is never treated as local', async () => {
  addonRoles.invoices = ['invoices:read']
  const session = await run({ 'x-pikku-addon': 'invoices', host: 'localhost', 'x-forwarded-for': '1.2.3.4' }, { userId: 'u', scopes: [] })
  assert.deepEqual(session?.scopes, [])
})

test('a call that names no addon is untouched, even locally', async () => {
  const original = { userId: 'owner', scopes: ['x'] }
  assert.deepEqual(await run({ host: 'localhost' }, original), original)
})

test('naming an addon that is not installed is refused', async () => {
  await assert.rejects(run({ 'x-pikku-addon': 'ghost', host: 'localhost' }, { userId: 'owner', scopes: [] }))
})
