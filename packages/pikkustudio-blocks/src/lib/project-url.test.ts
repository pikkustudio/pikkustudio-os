import { expect, test } from 'bun:test'
import { projectRewrite } from './project-url.ts'

const roundTrip = (path: string) => {
  const inside = projectRewrite.input!({ url: new URL(`http://x${path}`) } as never) as URL
  const outside = projectRewrite.output!({ url: new URL(inside.href) } as never) as URL
  return { inside: inside.pathname, team: inside.searchParams.get('team'), outside: outside.pathname }
}

test('a bare team address stays exactly as typed, so a team that is not found keeps its URL', () => {
  expect(roundTrip('/no-such-team')).toEqual({ inside: '/projects', team: '"no-such-team"', outside: '/no-such-team' })
})

test('a team page and a project page keep their address', () => {
  expect(roundTrip('/acme/new-project').outside).toBe('/acme/new-project')
  expect(roundTrip('/acme/no-such-project/overview').outside).toBe('/acme/no-such-project/overview')
})
