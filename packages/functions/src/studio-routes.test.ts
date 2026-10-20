import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// The app calls every studio:<name> RPC as POST /studio/<name> (see the invoke override in apps/studio __root.tsx),
// so a studio function the app calls without a route in studio.http.ts is a 404 in the browser. This keeps them matched.
const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const SOURCES = ['apps/studio/src', 'packages/pikkustudio-blocks/src', 'packages/pikkustudio-private/packages']
// Calls that reach the backend: query/mutation hooks and invoke. Stubs read mocks, so they need no route.
const CALL = /\b(?:usePikkuQuery|usePikkuMutation|usePikkuInfiniteQuery|invoke)\(\s*['"]studio:(\w+)['"]/g

// Called but unrouted before this check existed; each is a known 404 to fix or disable, not to add to.
const KNOWN_UNROUTED = new Set(['codeComments', 'addCodeComment', 'replyCodeComment', 'resolveCodeComment'])

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) return []
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return files(path)
    return /\.tsx?$/.test(name) && !/\.(test|gen)\./.test(name) ? [path] : []
  })

export const calledStudioNames = (): Map<string, string> => {
  const called = new Map<string, string>()
  for (const dir of SOURCES.map((s) => join(root, s)).filter(existsSync))
    for (const file of files(dir))
      for (const match of readFileSync(file, 'utf8').matchAll(CALL)) if (!called.has(match[1]!)) called.set(match[1]!, file.slice(root.length + 1))
  return called
}

export const routedStudioNames = (): Set<string> =>
  new Set([...readFileSync(join(root, 'packages/functions/src/studio.http.ts'), 'utf8').matchAll(/route: '\/studio\/(\w+)'/g)].map((m) => m[1]!))

describe('studio routes', () => {
  test('every studio function the app calls has a /studio/<name> route', () => {
    const routed = routedStudioNames()
    const missing = [...calledStudioNames()].filter(([name]) => !routed.has(name) && !KNOWN_UNROUTED.has(name)).map(([name, file]) => `${name} (called in ${file})`)
    expect(missing).toEqual([])
  })
  test('the known gaps are still gaps: once routed, drop them from the list', () => {
    const routed = routedStudioNames()
    expect([...KNOWN_UNROUTED].filter((name) => routed.has(name))).toEqual([])
  })
  test('the scan finds calls (a moved folder must not make it pass by finding nothing)', () => {
    expect(calledStudioNames().has('account')).toBe(true)
  })
})
