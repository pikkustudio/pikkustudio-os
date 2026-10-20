import assert from 'node:assert'
import { describe, test } from 'node:test'
import {
  LOCAL_TARGET_OPTION,
  LOCAL_VIEWER,
  publishStateOf,
  targetCaller,
  targetsOf,
  unreadOf,
  viewerOf,
  AccountUnreachableError,
  type AccountSource,
  type TargetOption,
  type TargetSources,
} from '../../src/services/shell-source.js'
import { ServiceUnavailableError } from '@pikku/core/errors'
import type { StageContext, StageReleases } from '../../src/services/stage-source.js'

const ctx = { project: { key: 'p', source: 'host', sourceId: 'c1' } } as unknown as StageContext
const stage = (name: string, production = false): TargetOption => ({ kind: 'stage', name, label: production ? null : name, live: true, production, isDefault: false, branch: null, forChanges: false })
const sandbox = (name: string): TargetOption => ({ kind: 'workspace', name, label: name, live: true, production: false, isDefault: true, branch: 'main', forChanges: false })

describe('studio:account', () => {
  test('with no account source, the viewer is this computer and sees everything', async () => {
    assert.deepStrictEqual(await viewerOf(undefined, {}), { user: null, teams: [], currentTeam: null, links: [], scopes: ['*'] })
  })
  test("a source's viewer is passed on, its scopes standing when it gives them", async () => {
    const source: AccountSource = { viewer: async ({ team }) => ({ user: { name: 'Ann', email: 'a@x' }, teams: [{ slug: 't', name: 'T', personal: false, memberCount: 2, projectCount: 1 }], currentTeam: team ?? null, links: [], scopes: ['diffui:read'] }) }
    const v = await viewerOf(source, { team: 't' })
    assert.strictEqual(v.currentTeam, 't')
    assert.deepStrictEqual(v.scopes, ['diffui:read'])
  })
  test("a source without scopes leaves Studio's own", async () => {
    const v = await viewerOf({ viewer: async () => ({ user: null, teams: [], currentTeam: null, links: [] }) }, {})
    assert.deepStrictEqual(v.scopes, ['*'])
  })
  test('a source that fails falls back to this computer when no team is asked about, or this computer is', async () => {
    const down: AccountSource = { viewer: async () => Promise.reject(new Error('down')) }
    assert.deepStrictEqual(await viewerOf(down, {}), LOCAL_VIEWER)
    assert.deepStrictEqual(await viewerOf(down, { team: 'local' }), LOCAL_VIEWER)
  })
  test("a source that fails for a team says the account can't be reached (503), not this computer", async () => {
    const down: AccountSource = { viewer: async () => Promise.reject(new Error('down')) }
    await assert.rejects(viewerOf(down, { team: 'phase3-demo' }), (e: unknown) => e instanceof AccountUnreachableError && e instanceof ServiceUnavailableError)
  })
})

describe('studio:targets', () => {
  test('the open build lists only this computer', async () => {
    assert.deepStrictEqual(await targetsOf(undefined, true, ctx), [LOCAL_TARGET_OPTION])
  })
  test('a project not on this computer has no local workspace', async () => {
    assert.deepStrictEqual(await targetsOf(undefined, false, null), [])
  })
  test("sources' targets follow, sandboxes before stages, and the local workspace stays the default", async () => {
    const sources: TargetSources = { stage: { list: async () => [stage('prod', true)] }, sandbox: { list: async () => [sandbox('box')] } }
    const all = await targetsOf(sources, true, ctx)
    assert.deepStrictEqual(all.map((t) => `${t.kind}/${t.name}/${t.isDefault}`), ['workspace/local/true', 'workspace/box/false', 'stage/prod/false'])
    const away = await targetsOf(sources, false, ctx)
    assert.deepStrictEqual(away.map((t) => `${t.kind}/${t.name}/${t.isDefault}`), ['workspace/box/true', 'stage/prod/false'])
  })
  test('a kind that fails is left out', async () => {
    const sources: TargetSources = { stage: { list: async () => Promise.reject(new Error('down')) }, sandbox: { list: async () => [sandbox('box')] } }
    assert.deepStrictEqual((await targetsOf(sources, true, ctx)).map((t) => t.name), ['local', 'box'])
  })
})

describe('studio:targetCall', () => {
  test('only a kind whose source can call has a caller; the workspace never does', () => {
    const call = async () => 'ok'
    const sources: TargetSources = { stage: { list: async () => [], call }, sandbox: { list: async () => [] } }
    assert.strictEqual(targetCaller(sources, 'stage')?.call, call)
    assert.strictEqual(targetCaller(sources, 'sandbox'), null)
    assert.strictEqual(targetCaller(sources, 'workspace'), null)
    assert.strictEqual(targetCaller(undefined, 'stage'), null)
  })
})

describe('studio:publishState', () => {
  const releases = (statuses: string[] | null) =>
    ({ list: async () => (statuses ? { url: 'https://app.example', releases: statuses.map((status, i) => ({ id: String(i), status })) } : null) }) as unknown as StageReleases
  test('nothing published, or no host that publishes, is null', async () => {
    assert.strictEqual(await publishStateOf(undefined, ctx, null), null)
    assert.strictEqual(await publishStateOf(releases(null), ctx, null), null)
    assert.strictEqual(await publishStateOf(releases([]), ctx, null), null)
    assert.strictEqual(await publishStateOf(releases(['live']), null, null), null)
  })
  test("the latest release's state and where the copy is live", async () => {
    assert.deepStrictEqual(await publishStateOf(releases(['failed', 'live']), ctx, null), { state: 'failed', url: 'https://app.example' })
  })
})

describe('studio:notifications', () => {
  test('no notification source is null, so the bell hides', async () => {
    assert.strictEqual(await unreadOf(undefined, {}), null)
  })
  test("a source's count is passed on; one that fails is null", async () => {
    assert.strictEqual(await unreadOf({ unread: async () => 3 }, { team: 't' }), 3)
    assert.strictEqual(await unreadOf({ unread: async () => Promise.reject(new Error('down')) }, {}), null)
  })
})
