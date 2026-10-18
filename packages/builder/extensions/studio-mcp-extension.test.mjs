import assert from 'node:assert/strict'
import { afterEach, test } from 'node:test'
import register from './studio-mcp-extension.mjs'

const KEYS = ['PIKKU_STUDIO_SERVICE_TOKEN', 'PIKKU_STUDIO_MCP_URL', 'PORT']
const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]))

afterEach(() => {
  for (const key of KEYS) saved[key] === undefined ? delete process.env[key] : (process.env[key] = saved[key])
})

function load(env) {
  for (const key of KEYS) delete process.env[key]
  Object.assign(process.env, env)
  const calls = []
  register({ registerMcpServer: (name, config) => calls.push({ name, config }) })
  return calls
}

test('registers the studio server with a token reference, not the token', () => {
  const [call, ...rest] = load({ PIKKU_STUDIO_SERVICE_TOKEN: 's3cret' })
  assert.equal(rest.length, 0)
  assert.equal(call.name, 'studio')
  assert.equal(call.config.type, 'http')
  assert.deepEqual(call.config.headers, { Authorization: 'Bearer ${PIKKU_STUDIO_SERVICE_TOKEN}' })
  assert.ok(!JSON.stringify(call.config).includes('s3cret'))
})

test('defers the server and exposes installTool and listTools directly', () => {
  const [{ config }] = load({ PIKKU_STUDIO_SERVICE_TOKEN: 't' })
  assert.equal(config.exposure, 'deferred')
  assert.deepEqual(config.toolExposure, { installTool: 'direct', listTools: 'direct' })
  assert.match(config.description, /Call installTool when a command answers that a tool is missing/)
})

test('registers nothing without a token', () => {
  assert.deepEqual(load({}), [])
  assert.deepEqual(load({ PIKKU_STUDIO_SERVICE_TOKEN: '' }), [])
})

test('url defaults to the local port 4750', () => {
  assert.equal(load({ PIKKU_STUDIO_SERVICE_TOKEN: 't' })[0].config.url, 'http://127.0.0.1:4750/mcp')
})

test('url follows PORT, and PIKKU_STUDIO_MCP_URL wins', () => {
  assert.equal(load({ PIKKU_STUDIO_SERVICE_TOKEN: 't', PORT: '4741' })[0].config.url, 'http://127.0.0.1:4741/mcp')
  assert.equal(load({ PIKKU_STUDIO_SERVICE_TOKEN: 't', PORT: '4741', PIKKU_STUDIO_MCP_URL: 'https://studio.example/mcp' })[0].config.url, 'https://studio.example/mcp')
})
