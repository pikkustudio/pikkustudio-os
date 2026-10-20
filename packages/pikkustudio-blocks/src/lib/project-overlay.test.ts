import { describe, expect, test } from 'bun:test'
import { overlayOf } from './project-overlay'
import type { ListedProject } from '../blocks/TeamProjects'

const listed = (overview: Record<string, unknown>) =>
  ({ key: 'online:1', slug: 'p', name: 'p', location: 'online', open: false, busy: false, overview }) as unknown as ListedProject

describe('overlayOf', () => {
  test('a visit time revived as a Date by the fetch client comes out as an ISO string', () => {
    const at = '2026-10-20T13:38:50.169Z'
    const o = overlayOf(listed({ state: null, favourite: false, visitedAt: new Date(at), updatedAt: null }))
    expect(o.visitedAt).toBe(at)
  })

  test('a visit time already a string stays as it is, and none stays undefined', () => {
    expect(overlayOf(listed({ state: null, favourite: true, visitedAt: '2026-10-20T00:00:00.000Z' })).visitedAt).toBe('2026-10-20T00:00:00.000Z')
    expect(overlayOf(listed({ state: null, favourite: true, visitedAt: null })).visitedAt).toBeUndefined()
  })
})

describe('the Projects screen with devbox team phase3-demo', () => {
  // studio:listProjects as it came back for phase3-demo on 2026-10-20 (trimmed): one project visited, two not. Pikku's
  // fetch client turns the ISO visit time into a Date, which broke byVisit's localeCompare.
  const wire = {
    projects: [
      { key: 'online:b82e1670', slug: 'phase3-demo-2', name: 'phase3-demo-2', location: 'online', open: false, busy: false, overview: { state: 'progress', problem: null, livePlaces: null, attention: 0, updatedAt: '2026-10-20T13:26:34.004Z', visits: 0, image: null, repoUrl: null, favourite: false, visitedAt: null } },
      { key: 'online:3f20ec1b', slug: 'phase3-demo-3', name: 'phase3-demo-3', location: 'online', open: false, busy: false, overview: { state: 'progress', problem: null, livePlaces: null, attention: 0, updatedAt: '2026-10-20T13:30:00.000Z', visits: 0, image: null, repoUrl: null, favourite: false, visitedAt: '2026-10-20T13:38:50.169Z' } },
      { key: 'online:cdacef7a', slug: 'phase3-demo', name: 'phase3-demo', location: 'online', open: false, busy: false, overview: { state: 'progress', problem: null, livePlaces: null, attention: 0, updatedAt: '2026-10-20T13:10:00.000Z', visits: 0, image: null, repoUrl: null, favourite: false, visitedAt: null } },
    ],
  }

  // What @pikku/fetch's transformDates does to a response (dist/esm/transform-date.js:20,44; it isn't exported).
  const ISO_INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/
  const revive = (_: string, v: unknown) => (typeof v === 'string' && ISO_INSTANT.test(v) ? new Date(v) : v)

  test('cards keep ISO visit times and sort, visited first', async () => {
    const { toCard, byVisit } = await import('../screens/ProjectsScreen')
    const received = JSON.parse(JSON.stringify(wire), revive) as { projects: ListedProject[] }
    expect(received.projects[1].overview?.visitedAt).toBeInstanceOf(Date)
    const cards = received.projects.map((p) => ({ ...toCard(p), ...overlayOf(p) })).sort(byVisit)
    expect(cards[0].slug ?? cards[0].name).toBe('phase3-demo-3')
    expect(cards[0].visitedAt).toBe('2026-10-20T13:38:50.169Z')
    expect(cards.every((c) => c.visitedAt === undefined || typeof c.visitedAt === 'string')).toBe(true)
  })
})
