import assert from 'node:assert/strict'
import { test } from 'node:test'
import { piArgs } from './pi.js'

const loaded = (args: string[]) => args.filter((_, i) => args[i - 1] === '-e').map((path) => path.split('/').pop())

test('the studio MCP extension loads for builder modes', () => {
  assert.ok(loaded(piArgs({ skills: 'skills' })).includes('studio-mcp-extension.mjs'))
  assert.ok(loaded(piArgs({ skills: 'skills', scope: 'plan' as never })).includes('studio-mcp-extension.mjs'))
})

test('read-only explore and inspect roles do not load it', () => {
  process.env.PIKKU_IMPECCABLE_SKILL ??= ''
  assert.ok(!loaded(piArgs({ skills: 'skills', role: 'inspect' })).includes('studio-mcp-extension.mjs'))
  assert.ok(loaded(piArgs({ skills: 'skills', role: 'inspect' })).includes('navigate-extension.mjs'))
})
