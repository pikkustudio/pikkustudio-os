import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { StageVaultClient } from '../../vault/src/stage-vault-client.ts'
import { VaultClientSecretService } from '../../vault/src/client.ts'
import { generateSealingKeypair, keyIdFor, seal, serializeSealedValue } from '../../vault/src/sealed-box.ts'
import { startVault, vaultPaths, type RunningVault } from '../../vault/src/server.ts'
import { Broker } from '../src/broker.js'
import { BrokerError } from '../src/broker-error.js'
import { InMemoryStageDirectory } from '../src/in-memory-stage-directory.js'
import type { StageContext, StageCredentials } from '../src/stage-context.js'

const seen: { authorization: string | null; body: unknown }[] = []
const counts = { project: 0 }
let clock = 0
let sealedForProject = ''
let sealedForUser = ''

let home: string
let vault: RunningVault
let client: VaultClientSecretService
let stage: StageVaultClient
let project: ReturnType<typeof Bun.serve>
let connector: ReturnType<typeof Bun.serve>
let broker: Broker

const brokerWith = (overrides: Partial<ConstructorParameters<typeof Broker>[0]> = {}) =>
  new Broker({
    directory: (broker as any).options.directory,
    connectorUrl: (broker as any).options.connectorUrl,
    now: () => clock,
    ...overrides,
  })

beforeAll(async () => {
  home = mkdtempSync(join(tmpdir(), 'broker-vault-'))
  vault = (await startVault(home))!
  const paths = vaultPaths(home)
  const connection = { socketPath: paths.socket, token: readFileSync(paths.adminToken, 'utf8').trim() }
  client = new VaultClientSecretService(connection)
  stage = new StageVaultClient(connection)
  const { publicKey, keyId } = await client.sealingKey()
  sealedForProject = serializeSealedValue(seal(publicKey, keyId, 'sk_live_123'))
  sealedForUser = serializeSealedValue(seal(publicKey, keyId, 'sk_user_1'))

  project = Bun.serve({
    port: 0,
    fetch: (req) => {
      counts.project++
      const url = new URL(req.url)
      const connectorName = url.pathname.split('/').pop()
      if (connectorName !== 'stripe') return new Response('no', { status: 404 })
      if (url.searchParams.get('user') === 'u1') return Response.json({ sealed: sealedForUser })
      return Response.json({ sealed: sealedForProject })
    },
  })
  connector = Bun.serve({
    port: 0,
    fetch: async (req) => {
      seen.push({ authorization: req.headers.get('authorization'), body: await req.json() })
      return Response.json({ ok: true })
    },
  })
  const vaultCredentials = (projectUrl: string): StageCredentials => ({
    async get(connectorName, userId) {
      const query = userId ? `?user=${encodeURIComponent(userId)}` : ''
      const stored = await fetch(`${projectUrl}/credentials/${encodeURIComponent(connectorName)}${query}`)
      if (stored.status === 404) return null
      const { sealed } = (await stored.json()) as { sealed: string }
      return stage.openSealed('addon-broker', sealed)
    },
  })
  const projectUrl = `http://localhost:${project.port}`
  const directory = new InMemoryStageDirectory()
  directory.add('key-a', {
    projectId: 'a',
    stage: 'prod',
    allowedConnectors: ['stripe'],
    credentials: vaultCredentials(projectUrl),
  })
  directory.add('key-b', {
    projectId: 'b',
    stage: 'prod',
    allowedConnectors: [],
    credentials: vaultCredentials(projectUrl),
  })
  directory.add('key-c', {
    projectId: 'c',
    stage: 'dev',
    allowedConnectors: ['stripe', 'slack'],
    credentials: { get: async (name) => (name === 'stripe' ? 'sk_other_stage' : null) },
  })
  broker = new Broker({
    directory,
    connectorUrl: (name) => (name === 'stripe' ? `http://localhost:${connector.port}` : null),
    credentialTtlMs: 1000,
    now: () => clock,
  })
})

afterAll(async () => {
  project.stop(true)
  connector.stop(true)
  await vault.close()
  rmSync(home, { recursive: true, force: true })
})

describe('Broker.invoke', () => {
  test('has the vault open the project credential and forwards it to the connector', async () => {
    const response = await broker.invoke({
      apiKey: 'key-a',
      connector: 'stripe',
      fn: 'charges.list',
      body: { limit: 3 },
    })
    expect(await response.json()).toEqual({ ok: true })
    expect(seen.at(-1)).toEqual({ authorization: 'Bearer sk_live_123', body: { limit: 3 } })
  })

  test('rejects an unknown api key', async () => {
    const error = await broker
      .invoke({ apiKey: 'nope', connector: 'stripe', fn: 'x', body: {} })
      .catch((e) => e)
    expect(error).toBeInstanceOf(BrokerError)
    expect(error.status).toBe(401)
  })

  test('rejects a connector the project has not allowed', async () => {
    const error = await broker
      .invoke({ apiKey: 'key-b', connector: 'stripe', fn: 'x', body: {} })
      .catch((e) => e)
    expect(error.status).toBe(403)
  })

  test('fails when the credential was sealed to a different vault key', async () => {
    const other = generateSealingKeypair()
    sealedForProject = serializeSealedValue(seal(other.publicKey, keyIdFor(other.publicKey), 'x'))
    clock = 100_000
    await expect(
      brokerWith().invoke({ apiKey: 'key-a', connector: 'stripe', fn: 'x', body: {} })
    ).rejects.toThrow()
    const { publicKey, keyId } = await client.sealingKey()
    sealedForProject = serializeSealedValue(seal(publicKey, keyId, 'sk_live_123'))
  })

  test('opens the sealed value once per ttl, then again after it expires', async () => {
    clock = 200_000
    counts.project = 0
    const fresh = brokerWith({ credentialTtlMs: 1000 })
    const call = () => fresh.invoke({ apiKey: 'key-a', connector: 'stripe', fn: 'x', body: {} })
    await Promise.all([call(), call(), call()])
    await call()
    expect(counts.project).toBe(1)
    clock += 1001
    await call()
    expect(counts.project).toBe(2)
  })

  test('does not cache a failed load', async () => {
    clock = 300_000
    const failingDirectory = new InMemoryStageDirectory()
    failingDirectory.add('key-f', {
      projectId: 'f',
      stage: 'prod',
      allowedConnectors: ['stripe'],
      credentials: {
        get: async () => {
          counts.project += 100
          throw new Error('vault down')
        },
      },
    })
    const failing = brokerWith({ directory: failingDirectory })
    counts.project = 0
    const call = () => failing.invoke({ apiKey: 'key-f', connector: 'stripe', fn: 'x', body: {} })
    await expect(call()).rejects.toThrow('vault down')
    await expect(call()).rejects.toThrow('vault down')
    expect(counts.project).toBe(200)
  })

  test('serves several stages from one broker, each with its own credentials', async () => {
    await broker.invoke({ apiKey: 'key-c', connector: 'stripe', fn: 'x', body: {} })
    expect(seen.at(-1)?.authorization).toBe('Bearer sk_other_stage')
    await broker.invoke({ apiKey: 'key-a', connector: 'stripe', fn: 'x', body: {} })
    expect(seen.at(-1)?.authorization).toBe('Bearer sk_live_123')
  })

  test('uses the calling user\'s credential and caches users separately', async () => {
    clock = 400_000
    const fresh = brokerWith()
    await fresh.invoke({ apiKey: 'key-a', userId: 'u1', connector: 'stripe', fn: 'x', body: {} })
    expect(seen.at(-1)?.authorization).toBe('Bearer sk_user_1')
    await fresh.invoke({ apiKey: 'key-a', connector: 'stripe', fn: 'x', body: {} })
    expect(seen.at(-1)?.authorization).toBe('Bearer sk_live_123')
  })

  test('answers 404 when the stage has no credential for the connector', async () => {
    const error = await broker
      .invoke({ apiKey: 'key-c', connector: 'slack', fn: 'x', body: {} })
      .catch((e) => e)
    expect(error).toBeInstanceOf(BrokerError)
    expect(error.status).toBe(404)
  })
})
