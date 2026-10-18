import { test } from 'node:test'
import assert from 'node:assert/strict'
import { devContributors } from './dev-contributors.js'

test('an unresolvable contributor (compiled binary) yields none instead of crashing boot', () => {
  assert.deepEqual(devContributors(() => { throw new Error('Cannot find package') }), [])
})

test('a resolvable contributor is returned as a path', () => {
  assert.deepEqual(devContributors(() => 'file:///x/inbox.contributor.ts'), ['/x/inbox.contributor.ts'])
})
