import { test } from 'node:test'
import assert from 'node:assert/strict'
import { addonRoles } from '#pikku/screens/pikku-addon-roles.gen.js'
import { pikkuState } from '@pikku/core/state'
import { addonMayCall, addonRoleOf, addonUiCall } from './addon-ui.middleware.js'

const run = async (headers: Record<string, string>, session: { userId: string; scopes?: string[] } | undefined, path = '/rpc/invoices:list') => {
  let current = session
  await addonUiCall({} as never, {
    http: { request: { header: (name: string) => headers[name.toLowerCase()], path: () => path } },
    getSession: () => current,
    setInitialSession: (next: typeof session) => {
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

test("an addon's call goes only through the rpc route, to an addon function; Pikku checks which addons it reaches", async () => {
  assert.equal(addonMayCall('/rpc/billing:listPlans'), true)
  assert.equal(addonMayCall('/rpc/billing%3AlistPlans'), true)
  assert.equal(addonMayCall('/rpc/billingapi:listPlans'), true)
  assert.equal(addonMayCall('/rpc/listPlans'), false)
  assert.equal(addonMayCall('/rpc/:listPlans'), false)
  assert.equal(addonMayCall('/rpc/billing:'), false)
  assert.equal(addonMayCall('/studio/account'), false)
  assert.equal(addonMayCall(undefined), false)
  addonRoles.invoices = ['invoices:read']
  await assert.rejects(run({ 'x-pikku-addon': 'invoices' }, { userId: 'u', scopes: [] }, '/workflow/x/status/1'), /only call addon functions/)
})

test('a remote addon is a known caller with an empty role; an addon that is not wired stays unknown', async () => {
  const packages = pikkuState(null, 'addons', 'packages')
  packages.set('remotebilling', { package: '@acme/billing-api', remote: true } as never)
  packages.set('localbilling', { package: '@acme/billing' } as never)
  try {
    assert.deepEqual(addonRoleOf('remotebilling'), [])
    assert.equal(addonRoleOf('localbilling'), undefined)
    assert.equal(addonRoleOf('ghost'), undefined)
    const session = await run({ 'x-pikku-addon': 'remotebilling', host: 'studio.example.com' }, { userId: 'u', scopes: ['admin'] }, '/rpc/remotebilling:listPlans')
    assert.deepEqual(session?.scopes, [])
    await assert.rejects(run({ 'x-pikku-addon': 'localbilling', host: 'localhost' }, { userId: 'owner', scopes: [] }), /Unknown addon/)
  } finally {
    packages.delete('remotebilling')
    packages.delete('localbilling')
  }
})
