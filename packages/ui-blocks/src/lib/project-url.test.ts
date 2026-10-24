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
  expect(roundTrip('/acme/no-such-project/home').outside).toBe('/acme/no-such-project/home')
})

test('a bare inbox address is a project page, so it is not read as a team', () => {
  expect(roundTrip('/inbox').inside).toBe('/inbox')
})

test('the MCP sign-in pages are not read as a team, and keep their query', () => {
  const query = '?client_id=c&exp=1&sig=abc%3D'
  for (const page of ['/connect', '/connect/sign-in']) {
    const inside = projectRewrite.input!({ url: new URL(`http://x${page}${query}`) } as never) as URL
    expect(inside.pathname).toBe(page)
    expect(inside.search).toBe(query)
  }
})
