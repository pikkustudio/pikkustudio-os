import assert from 'node:assert/strict'
import { afterAll, beforeAll, test } from 'bun:test'
import { pikkuState, resetPikkuState } from '@pikku/core/state'
import { addFunction } from '@pikku/core/function'
import { PikkuMCPFetchServer } from '@pikku/modelcontextprotocol/fetch'
import { checkTools, installTool, listTools } from '../../../src/functions/tools.function.js'

const mcpJson = {
  tools: ['listTools', 'checkTools', 'installTool'].map((name) => ({ name, description: name, parameters: { type: 'object' } })),
  resources: [],
  prompts: [],
}
const TOKEN = 'studio-service-test-token'
const silent = { info() {}, warn() {}, error() {}, debug() {}, setLevel() {} }
const listed = [{ id: 'ghidra', name: 'Ghidra', status: 'missing' }]

let handler: (request: Request) => Promise<Response>
let previousToken: string | undefined

const post = async (body: unknown, token?: string) => {
  const response = await handler(
    new Request('http://studio.test/mcp', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json, text/event-stream',
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    })
  )
  const text = await response.text()
  const data = text.split('\n').find((l) => l.startsWith('data:'))
  return { status: response.status, headers: response.headers, body: data ? JSON.parse(data.slice(5).trim()) : text ? JSON.parse(text) : undefined }
}

beforeAll(async () => {
  previousToken = process.env.PIKKU_STUDIO_SERVICE_TOKEN
  process.env.PIKKU_STUDIO_SERVICE_TOKEN = TOKEN
  resetPikkuState()
  pikkuState(null, 'package', 'singletonServices', {
    logger: silent,
    studioTools: { list: async () => listed, checkAgain() {} },
  } as never)
  const funcs = { listTools, checkTools, installTool }
  for (const [name, func] of Object.entries(funcs)) {
    addFunction(name, func as never, null)
    pikkuState(null, 'function', 'meta')[name] = { name, sessionless: false, auth: true, permissions: [] } as never
    pikkuState(null, 'mcp', 'toolsMeta')[name] = {
      name,
      description: func.description,
      pikkuFuncId: name,
      inputSchema: null,
      outputSchema: null,
    } as never
  }
  const server = new PikkuMCPFetchServer(
    { name: 'studio', version: '1.0.0', mcpJSON: mcpJson, capabilities: { tools: {} } } as never,
    silent as never
  )
  await server.init()
  handler = server.createFetchHandler({ path: '/mcp' }).handler
})

afterAll(() => {
  if (previousToken === undefined) delete process.env.PIKKU_STUDIO_SERVICE_TOKEN
  else process.env.PIKKU_STUDIO_SERVICE_TOKEN = previousToken
  resetPikkuState()
})

const initialize = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'pi', version: '0' } },
}

test('/mcp challenges the handshake and tool calls that carry no token', async () => {
  for (const body of [initialize, { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'listTools', arguments: {} } }]) {
    const res = await post(body)
    assert.equal(res.status, 401)
    assert.match(res.headers.get('www-authenticate') ?? '', /Bearer/)
  }
})

test('/mcp does not run a tool for the wrong token', async () => {
  const res = await post({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'listTools', arguments: {} } }, 'nope')
  assert.ok(res.status === 401 || res.body?.error || res.body?.result?.isError)
  assert.ok(!JSON.stringify(res.body ?? '').includes('Ghidra'))
})

test('with the token, tools/list returns the three tools', async () => {
  assert.equal((await post(initialize, TOKEN)).status, 200)
  const res = await post({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, TOKEN)
  assert.equal(res.status, 200)
  assert.deepEqual(res.body.result.tools.map((t: { name: string }) => t.name).sort(), ['checkTools', 'installTool', 'listTools'])
})

test('with the token, tools/call listTools returns the tools', async () => {
  const res = await post({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'listTools', arguments: {} } }, TOKEN)
  assert.equal(res.status, 200)
  assert.equal(res.body.result.isError, false)
  assert.deepEqual(JSON.parse(res.body.result.content[0].text), { tools: listed })
})
