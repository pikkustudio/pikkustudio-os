import { describe, expect, test } from 'bun:test'
import { mkdtempSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { studioAuthSecret } from './auth-secret.js'

describe('studioAuthSecret', () => {
  test('is made once, kept private and reused', () => {
    const home = join(mkdtempSync(join(tmpdir(), 'studio-')), 'home')
    const first = studioAuthSecret(home)
    expect(first.length).toBeGreaterThanOrEqual(32)
    expect(statSync(join(home, 'auth-secret')).mode & 0o777).toBe(0o600)
    expect(studioAuthSecret(home)).toBe(first)
  })
})
