// Where a cloud project's calls go when there is no Studio backend on this computer (the web build). On the desktop the
// local backend does this itself (studioProjects.workspaceTarget, studio:projectProxy): it asks the source where the
// project's workspace is served, asks the Studio there which key it holds the project under, then passes the call on.
// The web build does the same from the browser: cloud:workspaceLink gives the workspace's base (controlplane's gateway,
// `<api>/workspace/<projectId>`, which checks membership and adds the workspace's credential), studio:listProjects
// there gives the key, and the call goes to the same path the local backend would use, with the session cookie.

/** A project key a contributed source holds: `<source>:<id>[@<workspace>]`. */
export const sourceKeyOf = (key: unknown): { source: string; id: string; workspace?: string } | null => {
  if (typeof key !== 'string') return null
  const at = key.indexOf(':')
  if (at <= 0) return null
  const [id, workspace] = key.slice(at + 1).split('@')
  return id ? { source: key.slice(0, at), id, workspace: workspace || undefined } : null
}

/**
 * Studio calls that take a source key but are the host's, not the workspace's: about the workspace itself (where it is,
 * whether it is up, cloning it here), the targets a host's sources add, and the published stages' releases, settings and
 * analytics. They stay with the backend (on the web, `<api>/studio/<name>`), as on the desktop. Logs and metrics follow
 * their target instead: the workspace's own go to it, a published stage's to the backend.
 */
const HOST_CALLS = new Set([
  'workspaceLink',
  'workspaceStatus',
  'targets',
  'projectTargets',
  'targetCall',
  'cloneProject',
  'projectReleases',
  'projectReleaseDetail',
  'projectReleasePreview',
  'projectReleaseAction',
  'publishState',
  'projectStageSettings',
  'saveProjectStageValue',
  'projectAnalyticsCounts',
])

/** Addons whose calls name a project by `projectKey` and are answered by the Studio that runs it: on the web, its workspace. */
const WORKSPACE_ADDONS = new Set(['inbox'])

type Target = { kind?: unknown; name?: unknown }

/** Whether a target is the workspace the key names (or the project's own), the only one the Studio there answers for. */
const ownWorkspace = (key: string, target: unknown) => {
  if (target === undefined || target === null) return true
  const t = target as Target
  const ref = sourceKeyOf(key)
  return t.kind === 'workspace' && (t.name === 'local' || t.name === ref?.workspace)
}

/**
 * Whether a `studio:<name>` call belongs to a cloud project's workspace: it names a project a source holds, and it is
 * neither a host call nor about a published stage.
 */
export const isWorkspaceCall = (name: string, data: unknown): data is { key: string } => {
  if (!name.startsWith('studio:') || HOST_CALLS.has(name.slice(7))) return false
  const input = data as { key?: unknown; stage?: unknown; target?: unknown } | null
  if (!input || typeof input !== 'object' || !sourceKeyOf(input.key)) return false
  if (input.stage !== undefined) return false
  return ownWorkspace(input.key as string, input.target)
}

/**
 * Whether an addon's call (`<addon>:<name>`) belongs to a cloud project's workspace: the addon keeps its data with the
 * Studio that runs the project (WORKSPACE_ADDONS), the call names a project a source holds, and not a published stage.
 */
export const isWorkspaceAddonCall = (name: string, data: unknown): data is { projectKey: string } => {
  const at = name.indexOf(':')
  if (at <= 0 || !WORKSPACE_ADDONS.has(name.slice(0, at))) return false
  const input = data as { projectKey?: unknown; stage?: unknown } | null
  if (!input || typeof input !== 'object' || !sourceKeyOf(input.projectKey)) return false
  return input.stage === undefined || input.stage === null
}

export type WorkspaceLink = { state: string; url: string; origin?: string }

/** Thrown when a workspace is still starting after the wait: status 503, as the gateway answers it. */
export class WorkspaceStartingError extends Error {
  status = 503
  state = 'starting' as const
  constructor() {
    super('The workspace is starting')
    this.name = 'WorkspaceStartingError'
  }
}

type Options = {
  /** cloud:workspaceLink: where the workspace is served, waking it. */
  link: (key: string) => Promise<WorkspaceLink>
  fetch?: typeof globalThis.fetch
  sleep?: (ms: number) => Promise<void>
  /** How long a call waits for a starting workspace before it gives up with WorkspaceStartingError. */
  maxWaitMs?: number
  /** How long a resolved workspace is reused, as the desktop's WORKSPACE_TARGET_TTL. */
  ttlMs?: number
  now?: () => number
}

const DEFAULT_RETRY_S = 3
const MAX_RETRY_S = 30

const retryAfterMs = (res: Response) => {
  const s = Number(res.headers.get('retry-after'))
  return Math.min(Math.max(Number.isFinite(s) && s > 0 ? s : DEFAULT_RETRY_S, 1), MAX_RETRY_S) * 1000
}

const LOOPBACK = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:|\/|$)/

/**
 * A workspace names its apps and design preview by the address they have inside it (127.0.0.1:<port>), which a browser
 * cannot open. Its public origin serves the same pages: the first app at `/`, the others and the design preview under
 * `/_frontend/<slug>/`.
 */
const reachable = (name: string, body: any, origin: string | undefined) => {
  if (!origin) return body
  if (name === 'studio:getDesignPreview' && body && LOOPBACK.test(body.url ?? '')) return { ...body, url: `${origin}/_frontend/design/` }
  if (name === 'studio:projectApps' && Array.isArray(body)) {
    return body.map((app, i) => (LOOPBACK.test(app?.url ?? '') ? { ...app, url: i === 0 ? `${origin}/` : `${origin}/_frontend/${app.slug}/` } : app))
  }
  return body
}

const failure = async (res: Response) => {
  const body = (await res.json().catch(() => null)) as { message?: string; error?: string; name?: string } | null
  const error = Object.assign(new Error(body?.message ?? body?.error ?? res.statusText ?? `The workspace answered ${res.status}`), { status: res.status })
  if (typeof body?.name === 'string') error.name = body.name
  return error
}

export function createWorkspaceRouter(options: Options) {
  const doFetch = options.fetch ?? ((input, init) => globalThis.fetch(input, init))
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)))
  const maxWaitMs = options.maxWaitMs ?? 2 * 60_000
  const ttlMs = options.ttlMs ?? 30_000
  const now = options.now ?? Date.now
  const targets = new Map<string, { at: number; target: Promise<{ url: string; remoteKey: string; origin?: string }> }>()

  /** A POST that waits out a workspace's 503 {state:'starting'}, per its Retry-After, up to maxWaitMs. */
  const post = async (url: string, body: unknown, started = now(), headers: Record<string, string> = {}): Promise<Response> => {
    for (;;) {
      const res = await doFetch(url, { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
      if (res.status !== 503) return res
      const wait = retryAfterMs(res)
      if (now() - started + wait > maxWaitMs) throw new WorkspaceStartingError()
      await sleep(wait)
    }
  }

  const resolve = async (key: string) => {
    const started = now()
    let link = await options.link(key)
    while (link.state !== 'ready' || !link.url) {
      if (link.state === 'failed' || link.state === 'off') throw Object.assign(new Error('The workspace is not running'), { status: 409 })
      if (now() - started + DEFAULT_RETRY_S * 1000 > maxWaitMs) throw new WorkspaceStartingError()
      await sleep(DEFAULT_RETRY_S * 1000)
      link = await options.link(key)
    }
    const url = link.url.replace(/\/+$/, '')
    const res = await post(`${url}/studio/listProjects`, {}, started)
    if (!res.ok) throw await failure(res)
    const remoteKey = ((await res.json()) as { projects?: { key: string }[] }).projects?.[0]?.key
    if (!remoteKey) throw new Error('The workspace has no project yet')
    return { url, remoteKey, origin: link.origin?.replace(/\/+$/, '') || undefined }
  }

  /** Where a source project's calls go, resolved once per ttlMs; a failed resolve is not kept. */
  const target = (key: string) => {
    const cached = targets.get(key)
    if (cached && now() - cached.at < ttlMs) return cached.target
    const entry = { at: now(), target: resolve(key) }
    targets.set(key, entry)
    entry.target.catch(() => targets.get(key) === entry && targets.delete(key))
    return entry.target
  }

  return {
    target,
    /** A workspace call (isWorkspaceCall) to the Studio in the project's workspace, under the key it holds it by. */
    async studio<T>(name: string, data: { key: string; target?: unknown }): Promise<T> {
      const { url, remoteKey, origin } = await target(data.key)
      const input: Record<string, unknown> = { ...data, key: remoteKey }
      if (data.target !== undefined) input.target = { kind: 'workspace', name: 'local' }
      const res = await post(`${url}/studio/${name.slice(7)}`, input)
      if (!res.ok) throw await failure(res)
      return reachable(name, await res.json().catch(() => null), origin) as T
    },
    /**
     * An addon's call (isWorkspaceAddonCall) to the Studio in the project's workspace, through its rpc route, under the
     * key it holds the project by and made as `caller` (the addon whose screen asks).
     */
    async addon<T>(name: string, data: { projectKey: string }, caller: string): Promise<T> {
      const { url, remoteKey } = await target(data.projectKey)
      const input = { ...data, projectKey: remoteKey }
      const res = await post(`${url}/rpc/${encodeURIComponent(name)}`, { rpcName: name, data: input }, now(), { 'x-pikku-addon': caller })
      if (!res.ok) throw await failure(res)
      return (await res.json().catch(() => null)) as T
    },
    /** A call to the project's own server, as the local backend's /p/<key>/rpc/<name> passes it on. */
    async project<T>(key: string, name: string, data?: unknown): Promise<T> {
      const { url, remoteKey } = await target(key)
      const res = await post(`${url}/p/${remoteKey}/rpc/${name}`, { rpcName: name, data })
      if (!res.ok) throw await failure(res)
      return (await res.json().catch(() => null)) as T
    },
  }
}

export type WorkspaceRouter = ReturnType<typeof createWorkspaceRouter>
