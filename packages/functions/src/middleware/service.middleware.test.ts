import assert from 'node:assert/strict'
import { test } from 'bun:test'
import { credentialFrom } from './service.middleware.js'
import { isServiceToken } from '../lib/sleep.js'

test('a Bearer header wins over a cookie', () => {
  assert.equal(credentialFrom('Bearer a', 'b'), 'Bearer a')
})

test('a cookie alone is read as a Bearer credential', () => {
  assert.equal(credentialFrom(undefined, 'tok'), 'Bearer tok')
  assert.equal(isServiceToken(credentialFrom(undefined, 'tok'), 'tok'), true)
})

test('nothing, or the wrong token, is refused', () => {
  assert.equal(isServiceToken(credentialFrom(undefined, undefined), 'tok'), false)
  assert.equal(isServiceToken(credentialFrom(undefined, 'nope'), 'tok'), false)
})
