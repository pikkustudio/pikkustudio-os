import { describe, expect, test } from 'bun:test'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DEFAULT_SLEEP_SETTINGS, accessState, goToSleep, holdWhileStreaming, idleServers, isServiceToken, sleepBlockers } from './sleep.js'

const now = 1_000_000_000
const idle = { settings: DEFAULT_SLEEP_SETTINGS, now, lastAccessAt: now - 20 * 60_000, openConnections: 0, busyProjects: [] }

describe('sleepBlockers', () => {
  test('nothing blocks an idle Studio', () => {
    expect(sleepBlockers(idle)).toEqual([])
  })

  test('recent access blocks inside the window', () => {
    expect(sleepBlockers({ ...idle, lastAccessAt: now - 3 * 60_000 })).toEqual([
      { check: 'access', reason: 'Studio was used 3 minutes ago' },
    ])
  })

  test('the window comes from the settings', () => {
    const settings = { ...DEFAULT_SLEEP_SETTINGS, idleMinutes: 30 }
    expect(sleepBlockers({ ...idle, settings }).map((b) => b.check)).toEqual(['access'])
  })

  test('an open connection blocks however long ago it started', () => {
    expect(sleepBlockers({ ...idle, openConnections: 2 })).toEqual([{ check: 'access', reason: '2 open connections' }])
  })

  test('a working builder blocks, once per project', () => {
    expect(sleepBlockers({ ...idle, busyProjects: ['a1', 'b2'] })).toEqual([
      { check: 'builder', reason: 'The builder is working in a1' },
      { check: 'builder', reason: 'The builder is working in b2' },
    ])
  })

  test('a disabled check never blocks', () => {
    const settings = { idleMinutes: 15, checks: { access: false, builder: false } }
    expect(sleepBlockers({ ...idle, settings, openConnections: 1, lastAccessAt: now, busyProjects: ['a1'] })).toEqual([])
  })
})

describe('idleServers', () => {
  const minutes = (m: number) => m * 60_000
  const ages: Record<string, number> = { a1: minutes(20), 'a1.tidy': minutes(2), b2: minutes(40), c3: minutes(15) }
  const base = { open: Object.keys(ages), busy: [], idleFor: (key: string) => ages[key]!, idleMinutes: 15, keeping: false }

  test('stops only the servers idle for the whole window', () => {
    expect(idleServers(base)).toEqual(['a1', 'b2', 'c3'])
  })

  test('a server the builder is working in is never stopped, however idle', () => {
    expect(idleServers({ ...base, busy: ['b2'] })).toEqual(['a1', 'c3'])
  })

  test('a session counts as its own server', () => {
    expect(idleServers({ ...base, idleMinutes: 1 })).toContain('a1.tidy')
    expect(idleServers({ ...base, busy: ['a1.tidy'], idleMinutes: 1 })).not.toContain('a1.tidy')
  })

  test('nothing stops while a keep is in flight', () => {
    expect(idleServers({ ...base, keeping: true })).toEqual([])
  })
})

describe('holdWhileStreaming', () => {
  test('counts a streamed response as open until it ends', async () => {
    const before = accessState().openConnections
    const response = holdWhileStreaming(new Response('hello'))
    expect(accessState().openConnections).toBe(before + 1)
    expect(await response.text()).toBe('hello')
    expect(accessState().openConnections).toBe(before)
  })

  test('releases when the client goes away', async () => {
    const before = accessState().openConnections
    const response = holdWhileStreaming(new Response(new ReadableStream({ pull: () => new Promise(() => {}) })))
    expect(accessState().openConnections).toBe(before + 1)
    await response.body!.cancel()
    expect(accessState().openConnections).toBe(before)
  })
})

describe('isServiceToken', () => {
  test('accepts only the configured bearer', () => {
    expect(isServiceToken('Bearer s3cret', 's3cret')).toBe(true)
    expect(isServiceToken('Bearer nope', 's3cret')).toBe(false)
    expect(isServiceToken('s3cret', 's3cret')).toBe(false)
    expect(isServiceToken('Bearer s3cret', undefined)).toBe(false)
    expect(isServiceToken(undefined, 's3cret')).toBe(false)
  })
})

describe('goToSleep', () => {
  const studioWith = (saveWork: () => Promise<unknown>, calls: string[]) =>
    ({
      home: mkdtempSync(join(tmpdir(), 'studio-sleep-')),
      builder: { state: async () => ({ busy: false }), cancel: () => calls.push('cancel') },
      projects: {
        keys: async () => ['a1'],
        settle: async () => calls.push('settle'),
        saveWork: async () => (calls.push('save'), saveWork()),
        openKeys: () => ['a1'],
        stop: async (key: string) => calls.push(`stop ${key}`),
      },
    }) as never
  const logger = { info: () => {}, warn: (m: string) => warnings.push(m) } as never
  const warnings: string[] = []

  test('the builder’s work is saved after the builders stop and before the projects do', async () => {
    const calls: string[] = []
    await goToSleep(studioWith(async () => [{ branch: 'studio/a1', committed: true, pushed: true }], calls), logger)
    expect(calls.indexOf('settle')).toBeLessThan(calls.indexOf('save'))
    expect(calls.indexOf('save')).toBeLessThan(calls.indexOf('stop a1'))
  })

  test('a save that fails, or a branch that will not push, is reported and the sleep goes on', async () => {
    warnings.length = 0
    const calls: string[] = []
    await goToSleep(studioWith(async () => { throw new Error('no network') }, calls), logger)
    await goToSleep(studioWith(async () => [{ branch: 'studio/a1', committed: true, pushed: false, error: 'rejected' }], calls), logger)
    expect(calls.filter((c) => c === 'stop a1')).toHaveLength(2)
    expect(warnings.join('\n')).toContain('no network')
    expect(warnings.join('\n')).toContain('studio/a1 was not pushed: rejected')
  })
})
