import { expect, test } from 'bun:test'
import { WorkspaceStartingError, createWorkspaceRouter, isWorkspaceCall, sourceKeyOf } from './workspace-route.ts'

const API = 'https://api.pikkustudio.app'
const WS = `${API}/workspace/p1`

type Call = { url: string; init: RequestInit; body: any }

// A gateway and controlplane in one mocked fetch: answers come from `routes` by URL, in order when a list.
const mockFetch = (routes: Record<string, (Response | (() => Response))[]>) => {
  const calls: Call[] = []
  const fetch = (async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = String(input)
    calls.push({ url, init, body: init.body ? JSON.parse(String(init.body)) : undefined })
    const queue = routes[url]
    if (!queue?.length) return Response.json({ message: `no route ${url}` }, { status: 404 })
    const next = queue.length > 1 ? queue.shift()! : queue[0]
    return typeof next === 'function' ? next() : next.clone()
  }) as typeof globalThis.fetch
  return { fetch, calls }
}

const starting = (retryAfter = '2') => () => Response.json({ state: 'starting' }, { status: 503, headers: { 'retry-after': retryAfter } })
const projects = Response.json({ projects: [{ key: 'local-key' }] })

const clock = () => {
  let t = 0
  const slept: number[] = []
  return { now: () => t, sleep: async (ms: number) => void (slept.push(ms), (t += ms)), slept }
}

test('source keys and which studio calls belong to the workspace', () => {
  expect(sourceKeyOf('cloud:p1')).toEqual({ source: 'cloud', id: 'p1', workspace: undefined })
  expect(sourceKeyOf('cloud:p1@dev')).toEqual({ source: 'cloud', id: 'p1', workspace: 'dev' })
  expect(sourceKeyOf('acme/shop')).toBeNull()
  expect(isWorkspaceCall('studio:projectLogs', { key: 'cloud:p1' })).toBe(true)
  expect(isWorkspaceCall('studio:builderChat', { key: 'cloud:p1', message: 'hi' })).toBe(true)
  expect(isWorkspaceCall('studio:projectLogEntries', { key: 'cloud:p1', target: { kind: 'workspace', name: 'local' } })).toBe(true)
  // a project on this computer, a host call, a published stage, a call with no key
  expect(isWorkspaceCall('studio:projectLogs', { key: 'acme/shop' })).toBe(false)
  for (const host of ['workspaceLink', 'workspaceStatus', 'targets', 'projectTargets', 'targetCall', 'cloneProject']) expect(isWorkspaceCall(`studio:${host}`, { key: 'cloud:p1' })).toBe(false)
  expect(isWorkspaceCall('studio:projectReleases', { key: 'cloud:p1', stage: 'prod' })).toBe(false)
  expect(isWorkspaceCall('studio:projectLogEntries', { key: 'cloud:p1', target: { kind: 'stage', name: 'prod' } })).toBe(false)
  expect(isWorkspaceCall('studio:listProjects', {})).toBe(false)
  expect(isWorkspaceCall('console:getAllMeta', { key: 'cloud:p1' })).toBe(false)
})

test('a studio call goes to <api>/workspace/<id>/studio/<name> with the cookie, under the key the workspace holds', async () => {
  const links: string[] = []
  const { fetch, calls } = mockFetch({ [`${WS}/studio/listProjects`]: [projects], [`${WS}/studio/projectLogs`]: [Response.json({ sources: [] })] })
  const router = createWorkspaceRouter({ fetch, link: async (key) => (links.push(key), { state: 'ready', url: WS }) })
  expect(await router.studio('studio:projectLogs', { key: 'cloud:p1' })).toEqual({ sources: [] })
  expect(links).toEqual(['cloud:p1'])
  expect(calls.map((c) => c.url)).toEqual([`${WS}/studio/listProjects`, `${WS}/studio/projectLogs`])
  expect(calls.every((c) => c.init.credentials === 'include' && c.init.method === 'POST')).toBe(true)
  expect(calls[1].body).toEqual({ key: 'local-key' })
  // the resolved workspace is reused
  await router.studio('studio:projectLogs', { key: 'cloud:p1' })
  expect(links).toEqual(['cloud:p1'])
})

test('an own-workspace target is the workspace Studio\'s own local one', async () => {
  const { fetch, calls } = mockFetch({ [`${WS}/studio/listProjects`]: [projects], [`${WS}/studio/projectLogEntries`]: [Response.json({ logs: [] })] })
  const router = createWorkspaceRouter({ fetch, link: async () => ({ state: 'ready', url: WS }) })
  await router.studio('studio:projectLogEntries', { key: 'cloud:p1@dev', target: { kind: 'workspace', name: 'dev' }, minutes: 5 } as never)
  expect(calls[1].body).toEqual({ key: 'local-key', target: { kind: 'workspace', name: 'local' }, minutes: 5 })
})

test('a project call goes to <api>/workspace/<id>/p/<key>/rpc/<name>', async () => {
  const { fetch, calls } = mockFetch({ [`${WS}/studio/listProjects`]: [projects], [`${WS}/p/local-key/rpc/console:getAllMeta`]: [Response.json({ meta: 1 })] })
  const router = createWorkspaceRouter({ fetch, link: async () => ({ state: 'ready', url: `${WS}/` }) })
  expect(await router.project('cloud:p1', 'console:getAllMeta', { a: 1 })).toEqual({ meta: 1 })
  expect(calls[1]).toMatchObject({ url: `${WS}/p/local-key/rpc/console:getAllMeta`, body: { rpcName: 'console:getAllMeta', data: { a: 1 } } })
  expect(calls[1].init.credentials).toBe('include')
})

test('a 503 starting is waited out per Retry-After, then retried', async () => {
  const c = clock()
  const { fetch, calls } = mockFetch({
    [`${WS}/studio/listProjects`]: [starting('2'), starting('5'), projects],
    [`${WS}/studio/projectApps`]: [starting(''), Response.json([])],
  })
  const router = createWorkspaceRouter({ fetch, link: async () => ({ state: 'ready', url: WS }), sleep: c.sleep, now: c.now })
  expect(await router.studio('studio:projectApps', { key: 'cloud:p1' })).toEqual([])
  expect(c.slept).toEqual([2000, 5000, 3000])
  expect(calls.length).toBe(5)
})

test('a workspace still starting after the wait fails as 503, and the next call tries again', async () => {
  const c = clock()
  const { fetch } = mockFetch({ [`${WS}/studio/listProjects`]: [starting('10')] })
  let links = 0
  const router = createWorkspaceRouter({ fetch, link: async () => (links++, { state: 'ready', url: WS }), sleep: c.sleep, now: c.now, maxWaitMs: 35_000 })
  const error = await router.studio('studio:projectApps', { key: 'cloud:p1' }).catch((e) => e)
  expect(error).toBeInstanceOf(WorkspaceStartingError)
  expect(error.status).toBe(503)
  expect(c.slept).toEqual([10000, 10000, 10000])
  await router.studio('studio:projectApps', { key: 'cloud:p1' }).catch(() => null)
  expect(links).toBe(2)
})

test('a link that is still starting is asked again until it has a url', async () => {
  const c = clock()
  const answers = [{ state: 'starting', url: '' }, { state: 'starting', url: '' }, { state: 'ready', url: WS }]
  const { fetch } = mockFetch({ [`${WS}/studio/listProjects`]: [projects], [`${WS}/studio/projectMeta`]: [Response.json({ name: 'x' })] })
  const router = createWorkspaceRouter({ fetch, link: async () => answers.shift()!, sleep: c.sleep, now: c.now })
  expect(await router.studio('studio:projectMeta', { key: 'cloud:p1' })).toEqual({ name: 'x' })
  expect(c.slept).toEqual([3000, 3000])
})

test('errors keep their status, message and name', async () => {
  const { fetch } = mockFetch({ [`${WS}/studio/listProjects`]: [projects], [`${WS}/studio/projectMeta`]: [Response.json({ name: 'ForbiddenError', message: 'not a member' }, { status: 403 })] })
  const router = createWorkspaceRouter({ fetch, link: async () => ({ state: 'ready', url: WS }) })
  const error = await router.studio('studio:projectMeta', { key: 'cloud:p1' }).catch((e) => e)
  expect(error).toMatchObject({ status: 403, message: 'not a member', name: 'ForbiddenError' })
  const off = createWorkspaceRouter({ fetch, link: async () => ({ state: 'off', url: '' }) })
  expect(await off.studio('studio:projectMeta', { key: 'cloud:p1' }).catch((e) => e.status)).toBe(409)
})
