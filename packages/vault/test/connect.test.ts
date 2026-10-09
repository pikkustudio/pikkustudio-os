import { expect, test } from 'bun:test'
import { isCompiled } from '../src/connect.js'

test('detects the compiled binary virtual filesystem', () => {
  expect(isCompiled('file:///$bunfs/root/vault/connect.ts')).toBe(true)
  expect(isCompiled('file:///Users/x/packages/vault/src/connect.ts')).toBe(false)
})
