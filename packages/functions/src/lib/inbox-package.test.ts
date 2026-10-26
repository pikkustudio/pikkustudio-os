import { test } from 'node:test'
import assert from 'node:assert/strict'
import { inboxPackageDir } from './inbox-package.js'

test('an unresolvable package (compiled binary) yields none instead of crashing boot', () => {
  assert.equal(
    inboxPackageDir(() => {
      throw new Error('Cannot find package')
    }),
    undefined,
  )
})

test('a resolvable package gives its directory, two levels above the contributors module', () => {
  assert.equal(
    inboxPackageDir(() => 'file:///x/addon-inbox/src/contributors.ts'),
    '/x/addon-inbox',
  )
})
