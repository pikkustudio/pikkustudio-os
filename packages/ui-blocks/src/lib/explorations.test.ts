import { describe, expect, test } from 'bun:test'
import { newExplorationId, withoutExplorationMembers } from './explorations'
import type { Artifact } from '../types/artifacts'

const a = (id: string, kind: Artifact['kind'], exploration?: string): Artifact => ({ id, kind, title: id, summary: '', at: 1, ...(exploration ? { exploration } : {}) })

describe('withoutExplorationMembers', () => {
  test('hides designs in an exploration, keeps pages and documents', () => {
    const out = withoutExplorationMembers([a('d1', 'Design', 'x'), a('d2', 'Design'), a('p', 'Page'), a('doc', 'Document')])
    expect(out.map((i) => i.id)).toEqual(['p', 'doc'])
  })
})

describe('newExplorationId', () => {
  test('is a fresh id that is never the implicit first round', () => {
    const ids = new Set(Array.from({ length: 50 }, () => newExplorationId()))
    expect(ids.size).toBeGreaterThan(40)
    for (const id of ids) expect(id).toMatch(/^x[0-9a-f]{6}$/)
  })
})
