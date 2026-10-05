import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalise } from './embed.js'

test('a normalised vector has length one, so cosine is a dot product', () => {
  const v = normalise([3, 4])
  assert.ok(Math.abs(Math.hypot(...v) - 1) < 1e-6)
})

test('the zero vector does not divide by zero', () => {
  assert.deepEqual([...normalise([0, 0])], [0, 0])
})
