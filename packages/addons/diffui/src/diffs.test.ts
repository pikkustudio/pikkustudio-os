import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pairDiffs } from './diffs.js'

test('an original and its prototype become one pair', () => {
  assert.deepEqual(
    pairDiffs([
      'overview-dark-healthy-original.png',
      'overview-dark-healthy-prototype.png',
    ]),
    [
      {
        screen: 'overview',
        theme: 'dark',
        state: 'healthy',
        original: 'overview-dark-healthy-original.png',
        prototype: 'overview-dark-healthy-prototype.png',
      },
    ]
  )
})

test('a shot with no counterpart is not a diff', () => {
  assert.deepEqual(pairDiffs(['overview-dark-healthy-original.png']), [])
})

test('themes of the same screen stay separate pairs', () => {
  const pairs = pairDiffs([
    'sign-in-light-error-original.png',
    'sign-in-light-error-prototype.png',
    'sign-in-dark-error-original.png',
    'sign-in-dark-error-prototype.png',
  ])
  assert.deepEqual(pairs.map((p) => p.theme).sort(), ['dark', 'light'])
})

test('files that are not shots are ignored', () => {
  assert.deepEqual(pairDiffs(['notes.md', '.DS_Store']), [])
})
