import { expect, test } from 'bun:test'
import type { NavScreen } from './nav-registry.ts'
import { agentAt, pathMatches, screenFor } from './screen-agent.ts'

const s = (path: string, extra: Partial<NavScreen> = {}): NavScreen => ({ path, title: 't', scope: 'project', addon: 'spindle', ...extra })
const screens = [
  s('/spindle'),
  s('/spindle/search', { agent: 'librarian', agentTitle: 'a_title', agentDescription: 'a_desc' }),
  s('/spindle/collections/:id', { agent: 'studio:knowledge' }),
  s('/spindle/collections/new'),
]
const labels = (x: NavScreen) => (x.agent ? { agent: x.agent, addon: x.addon, title: x.agentTitle ? (x.agentTitle as never) : null, description: x.agentDescription ? (x.agentDescription as never) : null } : null)

test('matches params and splats', () => {
  expect(pathMatches('/a/:id', '/a/1')).toBe(true)
  expect(pathMatches('/a/:id', '/a')).toBe(false)
  expect(pathMatches('/code/*', '/code/x/y')).toBe(true)
})
test('static segment beats a param', () => {
  expect(screenFor('/spindle/collections/new', screens)?.path).toBe('/spindle/collections/new')
})
test('an addon agent carries title and description', () => {
  expect(agentAt('/spindle/search', screens, labels)).toEqual({ agent: 'librarian', addon: 'spindle', title: 'a_title', description: 'a_desc' })
})
test('a studio agent has none', () => {
  expect(agentAt('/spindle/collections/k1', screens, labels)).toEqual({ agent: 'studio:knowledge', addon: 'spindle', title: null, description: null })
})
test('no agent, no screen', () => {
  expect(agentAt('/spindle', screens, labels)).toBeNull()
  expect(agentAt('/nope', screens, labels)).toBeNull()
})
