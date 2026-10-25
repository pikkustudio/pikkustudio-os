import { describe, expect, test } from 'bun:test'
import { withoutExplorationMembers } from './explorations'
import type { Artifact } from '../types/artifacts'

const a = (id: string, kind: Artifact['kind'], exploration?: string): Artifact => ({ id, kind, title: id, summary: '', at: 1, ...(exploration ? { exploration } : {}) })

describe('withoutExplorationMembers', () => {
  test('hides designs in an exploration, keeps pages and documents', () => {
    const out = withoutExplorationMembers([a('d1', 'Design', 'x'), a('d2', 'Design'), a('p', 'Page'), a('doc', 'Document')])
    expect(out.map((i) => i.id)).toEqual(['p', 'doc'])
  })
})
