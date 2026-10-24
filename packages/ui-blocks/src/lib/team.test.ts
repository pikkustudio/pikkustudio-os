import { expect, test } from 'bun:test'
import { teamVerdict, unreadableVerdict } from './team.ts'

const teams = ['bamboorose', 'acme']

test('a team the person is in loads', () => {
  expect(teamVerdict({ team: 'acme', teams, fallback: 'bamboorose', fetching: false })).toBe('ok')
})

test('a team that does not exist is not found and never moves to another team', () => {
  expect(teamVerdict({ team: 'no-such-team', teams, fallback: 'bamboorose', fetching: false })).toBe('missing')
})

test('a real team the person is not in looks exactly like one that does not exist', () => {
  expect(teamVerdict({ team: 'someone-else', teams, fallback: 'bamboorose', fetching: false })).toEqual(teamVerdict({ team: 'no-such-team', teams, fallback: 'bamboorose', fetching: false }))
})

test('a person with no teams gets not found too', () => {
  expect(teamVerdict({ team: 'acme', teams: [], fallback: undefined, fetching: false })).toBe('missing')
})

test('a URL without a team takes the fallback', () => {
  expect(teamVerdict({ team: undefined, teams, fallback: 'bamboorose', fetching: false })).toEqual({ to: 'bamboorose' })
  expect(teamVerdict({ team: undefined, teams: [], fallback: undefined, fetching: false })).toBe('ok')
})

test('an unknown team waits while the list is still refreshing, so a team just joined is not shown as missing', () => {
  expect(teamVerdict({ team: 'just-made', teams, fallback: 'bamboorose', fetching: true })).toBe('pending')
})

test("an account that can't be read: a team URL says so, this computer and a URL without a team carry on", () => {
  expect(unreadableVerdict('phase3-demo')).toBe('unreachable')
  expect(unreadableVerdict('local')).toBe('ok')
  expect(unreadableVerdict(undefined)).toBe('ok')
})
