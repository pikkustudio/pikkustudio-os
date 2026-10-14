import { test } from 'node:test'
import assert from 'node:assert/strict'
import { matchScreen, splitAddonPath } from './match.js'

const screens = [{ path: '/' }, { path: '/new' }, { path: '/:id' }, { path: '/:id/lines/:line' }]

test('the index screen matches an empty subpath', () => {
  assert.equal(matchScreen(screens, '/')?.screen.path, '/')
  assert.equal(matchScreen(screens, '')?.screen.path, '/')
})

test('a literal screen wins over a parameter at the same depth', () => {
  assert.equal(matchScreen(screens, '/new')?.screen.path, '/new')
})

test('parameters are captured and decoded', () => {
  const match = matchScreen(screens, '/INV%2F7/lines/3')
  assert.equal(match?.screen.path, '/:id/lines/:line')
  assert.deepEqual(match?.params, { id: 'INV/7', line: '3' })
})

test('a path no screen declares matches nothing', () => {
  assert.equal(matchScreen(screens, '/a/b/c'), null)
})

test('the addon name is split from the screen path', () => {
  assert.deepEqual(splitAddonPath('invoices/abc/lines/2'), { name: 'invoices', subpath: '/abc/lines/2' })
  assert.deepEqual(splitAddonPath('invoices'), { name: 'invoices', subpath: '/' })
})
