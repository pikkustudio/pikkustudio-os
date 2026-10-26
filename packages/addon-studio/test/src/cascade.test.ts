import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { chainFor, isScope, resolveEffective, setIn, toEnv, unsetIn, type ScopedSource } from '../../src/lib/sources/index.js'
import { generatedSource, memoryGeneratedStore, vaultGeneratedStore, projectSource, vaultPersonalSource, personalKey } from '../../src/lib/sources/file-sources.js'
import { LEASE_MS, leased } from '../../src/lib/sources/lease.js'
import { LayeredSecretService, fromSecretService } from '../../src/lib/sources/layered-secret-service.js'
import { resolve, writeTo, type Layer } from '../../src/lib/sources/layers.js'
import { active, ownerFor } from '../../src/lib/sources/owner.js'

const memory = (name: string, data: Record<string, Record<string, string>>): ScopedSource => ({
  name,
  read: async (scope) => data[scope] ?? {},
  write: async (scope, values) => void (data[scope] = values),
})

describe('scopes', () => {
  test('dev and ci are separate chains and neither knows about stages', () => {
    assert.deepEqual(chainFor({ kind: 'dev' }), ['default', 'dev'])
    assert.deepEqual(chainFor({ kind: 'ci' }), ['default', 'ci'])
    assert.deepEqual(chainFor({ kind: 'dev', workspace: 'menu-page' }), ['default', 'dev', 'workspace:menu-page'])
    assert.equal(isScope('production'), false)
    assert.equal(isScope('stage:abc'), false)
    assert.equal(isScope('preview'), false)
    assert.equal(isScope('workspace:menu-page'), true)
    assert.throws(() => chainFor({ kind: 'dev', workspace: '../x' }), /workspace name/)
  })
})

describe('resolveEffective', () => {
  test('a narrower scope beats a wider one, and within a scope the first source wins', async () => {
    const personal = memory('personal', { default: { A: 'p-default' }, 'workspace:w': { B: 'p-w' } })
    const project = memory('project', { default: { A: 'proj-default', B: 'proj-default', C: 'c' }, dev: { C: 'c-dev' } })
    const got = await resolveEffective([personal, project], { kind: 'dev', workspace: 'w' })
    assert.deepEqual(got.A, { value: 'p-default', scope: 'default', source: 'personal' })
    assert.deepEqual(got.B, { value: 'p-w', scope: 'workspace:w', source: 'personal' })
    assert.deepEqual(got.C, { value: 'c-dev', scope: 'dev', source: 'project' })
  })

  test('a ci run does not see dev values', async () => {
    const project = memory('project', { dev: { DB: 'local' }, ci: { DB: 'ci-db' }, default: { X: '1' } })
    assert.deepEqual(toEnv(await resolveEffective([project], { kind: 'ci' })), { DB: 'ci-db', X: '1' })
    assert.deepEqual(toEnv(await resolveEffective([project], { kind: 'dev' })), { DB: 'local', X: '1' })
  })

  test('set and unset write only to the chosen source and scope', async () => {
    const personal = memory('personal', {})
    await setIn(personal, 'dev', 'K', 'v')
    await setIn(personal, 'dev', 'L', 'w')
    await unsetIn(personal, 'dev', 'K')
    assert.deepEqual(await personal.read('dev'), { L: 'w' })
    await assert.rejects(setIn({ name: 'ro', read: async () => ({}) }, 'dev', 'K', 'v'), /read only/)
  })
})

describe('file sources', () => {
  test('project reads .env files per scope, personal is read from the vault per project, generated is default only', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cascade-'))
    writeFileSync(join(dir, '.env'), 'A=1\nexport B="two"\n')
    writeFileSync(join(dir, '.env.dev'), 'A=dev\n')
    writeFileSync(join(dir, '.env.workspace.menu'), 'C=3\n')
    const project = projectSource(dir)
    assert.deepEqual(await project.read('default'), { A: '1', B: 'two' })
    assert.deepEqual(await project.read('dev'), { A: 'dev' })
    assert.deepEqual(await project.read('workspace:menu'), { C: '3' })
    assert.deepEqual(await project.read('ci'), {})

    const sealed = new Map([[personalKey('p1', 'dev', 'A'), 'mine'], [personalKey('p2', 'dev', 'A'), 'other'], [personalKey('p1', 'ci', 'B'), 'b']])
    const personal = vaultPersonalSource({ keys: async () => [...sealed.keys()], get: async (k) => sealed.get(k) }, 'p1')
    assert.deepEqual(await personal.read('dev'), { A: 'mine' })
    assert.deepEqual(await personal.read('ci'), { B: 'b' })
    assert.equal(personal.write, undefined)

    const generated = generatedSource(memoryGeneratedStore())
    await generated.write!('default', { S: 'x' })
    assert.deepEqual(await generated.read('default'), { S: 'x' })
    assert.deepEqual(await generated.read('dev'), {})
    await assert.rejects(generated.write!('dev', {}), /every run/)

    const vault = new Map<string, string>()
    const stored = generatedSource(vaultGeneratedStore({ keys: async () => [...vault.keys()], get: async (k) => vault.get(k), set: async (k, v) => void vault.set(k, v) }, 'p1'))
    await stored.write!('default', { BETTER_AUTH_SECRET: 's' })
    assert.deepEqual([...vault.keys()], ['generated:p1:BETTER_AUTH_SECRET'])
    assert.deepEqual(await stored.read('default'), { BETTER_AUTH_SECRET: 's' })
  })
})

describe('layers', () => {
  const layer = (name: string, seed: Record<string, string> = {}): Layer<string> => {
    const data = new Map(Object.entries(seed))
    return { name, get: async (k) => data.get(k), set: async (k, v) => void data.set(k, v), delete: async (k) => void data.delete(k) }
  }

  test('first layer wins, writes go where told, read only refuses', async () => {
    const layers = [layer('personal', { A: 'mine' }), layer('team', { A: 't', B: 'tb' })]
    assert.deepEqual(await resolve(layers, 'A'), { value: 'mine', layer: 'personal' })
    assert.deepEqual(await resolve(layers, 'B'), { value: 'tb', layer: 'team' })
    await writeTo(layers, 'team', 'Z', 'z')
    assert.equal((await resolve(layers, 'Z'))?.layer, 'team')
    await assert.rejects(writeTo([{ name: 'ro', get: async () => undefined }], 'ro', 'k', 'v'), /read only/)
  })

  test('LayeredSecretService cascades, reports the winner and writes to its target', async () => {
    const svc = new LayeredSecretService([layer('personal'), layer('team', { S: 'team' }), layer('project', { S: 'old' })])
    assert.equal((await svc.getSecret('S')).reveal(), 'team')
    assert.equal(await svc.whichLayer('S'), 'team')
    await svc.setSecret('S', 'mine')
    assert.equal(await svc.whichLayer('S'), 'personal')
    await svc.deleteSecret('S')
    assert.equal(await svc.whichLayer('S'), 'team')
    assert.equal(await svc.hasSecret('NOPE'), false)
    await assert.rejects(svc.getSecret('NOPE'), /not found/)
    assert.deepEqual(Object.keys(await svc.getSecrets(['S', 'NOPE'])), ['S'])
    assert.equal(await fromSecretService('project', svc).get('S'), 'team')
  })
})

describe('lease', () => {
  test('one fetch serves 24 hours, then asks again, sharing concurrent requests', async () => {
    let t = 1_000
    let calls = 0
    const l = leased('team', async () => (calls++, { A: `v${calls}` }), { now: () => t })
    assert.deepEqual(await Promise.all([l.get('A'), l.get('A')]), ['v1', 'v1'])
    t += LEASE_MS - 1
    assert.equal(await l.get('A'), 'v1')
    t += 2
    assert.equal(await l.get('A'), 'v2')
    assert.equal(calls, 2)
  })

  test('all returns the whole lease', async () => {
    const l = leased('team', async () => ({ A: '1', B: '2' }))
    assert.deepEqual(await l.all(), { A: '1', B: '2' })
  })

  test('a failed renewal never serves the stale lease', async () => {
    let t = 0
    let fail = false
    const l = leased('team', async () => { if (fail) throw new Error('offline'); return { A: 'x' } }, { now: () => t })
    assert.equal(await l.get('A'), 'x')
    t += LEASE_MS + 1
    fail = true
    assert.equal(await l.get('A'), undefined)
    assert.equal(l.expiresAt(), undefined)
  })
})

describe('owner', () => {
  test('a source owns a record only when linked to it and signed in', () => {
    assert.equal(ownerFor('host', true), 'host')
    assert.equal(ownerFor('host', false), 'local')
    assert.equal(ownerFor(null, true), 'local')
    assert.equal(active({ owner: () => 'host', local: 'L', sources: { host: 'F' } }), 'F')
    assert.equal(active({ owner: () => 'gone', local: 'L', sources: { host: 'F' } }), 'L')
  })
})
