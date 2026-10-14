import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resolveAddonScreen } from './resolve.js'

const addons = [
  {
    name: 'invoices',
    title: 'Invoices',
    screens: [
      { path: '/', title: 'Overview' },
      { path: '/:id', title: 'Invoice' },
    ],
  },
]

test('resolves a screen and its params under the addon name', () => {
  const resolved = resolveAddonScreen(addons, 'invoices/abc')
  assert.equal(resolved?.screen.title, 'Invoice')
  assert.deepEqual(resolved?.params, { id: 'abc' })
})

test('the bare addon name opens its index screen', () => {
  assert.equal(resolveAddonScreen(addons, 'invoices')?.screen.title, 'Overview')
})

test('an unknown addon resolves to nothing', () => {
  assert.equal(resolveAddonScreen(addons, 'ghost/x'), null)
})

test('a path the addon does not declare resolves to nothing', () => {
  assert.equal(resolveAddonScreen(addons, 'invoices/a/b'), null)
})
