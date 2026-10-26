import { expect, test } from 'bun:test'
import { agentRef, agentTabFor, resolveChatTab } from './agent-tab.ts'

const studio = { knowledge: { title: () => 'K' as never, description: () => 'KD' as never } }
const screen = (agent: string, extra = {}) => ({ agent, addon: 'spindle', title: 'T' as never, description: 'D' as never, ...extra })

test('a bare name is qualified by the screen addon, a studio name is kept', () => {
  expect(agentRef('librarian', 'spindle')).toBe('spindle:librarian')
  expect(agentRef('studio:knowledge', 'spindle')).toBe('studio:knowledge')
  expect(agentRef('librarian', null)).toBeNull()
  expect(agentRef('../x', 'spindle')).toBeNull()
  expect(agentRef('studio:../x', 'spindle')).toBeNull()
})

test('an addon agent tab takes the addon title and description', () => {
  expect(agentTabFor(screen('librarian'), studio)).toEqual({ ref: 'spindle:librarian', title: 'T', description: 'D' })
})

test('an addon agent without a title has no tab', () => {
  expect(agentTabFor(screen('librarian', { title: null }), studio)).toBeNull()
})

test('a studio agent takes the Studio wording; an unknown one has no tab', () => {
  expect(agentTabFor(screen('studio:knowledge', { title: null, description: null }), studio)).toEqual({ ref: 'studio:knowledge', title: 'K', description: 'KD' })
  expect(agentTabFor(screen('studio:nope'), studio)).toBeNull()
})

test('no screen agent, no tab', () => {
  expect(agentTabFor(null, studio)).toBeNull()
})

test('the agent tab falls back to Chat when the screen has no agent', () => {
  expect(resolveChatTab('agent', true)).toBe('agent')
  expect(resolveChatTab('agent', false)).toBe('chat')
  expect(resolveChatTab('chat', true)).toBe('chat')
})
