import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rmdir, stat, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)
const STORE_FILE = 'pikku-changes.json'
const DATES = new Set(['createdAt', 'claimExpiresAt', 'resolvedAt', 'acknowledgedAt', 'heldUntil'])

type Message = { messageId: string; changeId: string; authorKind: 'agent' | 'user'; authorName: string | null; body: string; attachments: unknown[]; chosenOption: string | null; createdAt: Date }
type Element = { sourceAnchor: string | null; text: string | null }
type Change = { changeId: string; shortId: string; title: string; body: string | null; status: string; capture: { elements?: Element[] } | null; createdAt: Date; [field: string]: unknown }
type Store = { nextShortId: number; changes: Change[]; groups: unknown[]; messages: Message[] }

export type CodeThread = {
  changeId: string
  shortId: string
  status: string
  path: string
  lineStart: number
  lineEnd: number
  text: string | null
  body: string
  createdAt: string
  messages: { messageId: string; authorKind: 'agent' | 'user'; authorName: string | null; body: string; createdAt: string }[]
}

export const anchorOf = (path: string, lineStart: number, lineEnd: number) => (lineEnd > lineStart ? `${path}:${lineStart}-${lineEnd}` : `${path}:${lineStart}`)

export const parseAnchor = (anchor: string | null | undefined) => {
  const hit = /^(.+):(\d+)(?:-(\d+))?$/.exec(anchor ?? '')
  return hit ? { path: hit[1]!, lineStart: Number(hit[2]), lineEnd: Number(hit[3] ?? hit[2]) } : null
}

export const commentBody = (path: string, lineStart: number, lineEnd: number, text: string | undefined, comment: string) =>
  [
    `Comment on ${path}, ${lineEnd > lineStart ? `lines ${lineStart}-${lineEnd}` : `line ${lineStart}`}:`,
    ...(text ? ['', ...text.split('\n').slice(0, 20).map((line) => `> ${line}`)] : []),
    '',
    comment,
  ].join('\n')

export async function storePath(projectDir: string) {
  const host = process.env.PIKKU_CHANGES_DIR?.trim()
  if (host) return join(host, STORE_FILE)
  const { stdout } = await run('git', ['rev-parse', '--git-common-dir'], { cwd: projectDir })
  const dir = stdout.trim()
  return join(isAbsolute(dir) ? dir : join(projectDir, dir), STORE_FILE)
}

async function read(path: string): Promise<Store> {
  try {
    return JSON.parse(await readFile(path, 'utf8'), (key, value) => (DATES.has(key) && typeof value === 'string' ? new Date(value) : value))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    return { nextShortId: 1, changes: [], groups: [], messages: [] }
  }
}

async function withStore<T>(path: string, fn: (store: Store) => T, write = true): Promise<T> {
  const lock = `${path}.lock`
  await mkdir(dirname(path), { recursive: true })
  for (let attempt = 0; ; attempt++) {
    try {
      await mkdir(lock)
      break
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      const held = await stat(lock).catch(() => null)
      if (held && Date.now() - held.mtimeMs > 30_000) {
        await rmdir(lock).catch(() => {})
        continue
      }
      if (attempt > 200) throw new Error('The changes list is busy right now. Try again in a moment.')
      await new Promise((resolve) => setTimeout(resolve, 25))
    }
  }
  try {
    const store = await read(path)
    const result = fn(store)
    if (write) {
      const tmp = `${path}.${process.pid}.tmp`
      await writeFile(tmp, JSON.stringify(store, null, 2))
      await rename(tmp, path)
    }
    return result
  } finally {
    await rmdir(lock)
  }
}

const iso = (value: Date | string) => new Date(value).toISOString()

const threadOf = (store: Store, change: Change): CodeThread | null => {
  const element = change.capture?.elements?.find((e) => parseAnchor(e.sourceAnchor))
  const anchor = parseAnchor(element?.sourceAnchor)
  if (!anchor) return null
  return {
    changeId: change.changeId,
    shortId: change.shortId,
    status: change.status,
    ...anchor,
    text: element?.text ?? null,
    body: change.body ?? change.title,
    createdAt: iso(change.createdAt),
    messages: store.messages
      .filter((m) => m.changeId === change.changeId)
      .map((m) => ({ messageId: m.messageId, authorKind: m.authorKind, authorName: m.authorName, body: m.body, createdAt: iso(m.createdAt) })),
  }
}

const find = (store: Store, ref: string) => {
  const change = store.changes.find((c) => c.changeId === ref)
  if (!change) throw new Error('That comment is not here any more')
  return change
}

export const listThreads = (file: string, path: string) =>
  withStore(file, (store) => store.changes.filter((c) => c.status !== 'dismissed').map((c) => threadOf(store, c)).filter((t): t is CodeThread => !!t && t.path === path), false)

export const addThread = (file: string, input: { path: string; lineStart: number; lineEnd: number; text?: string; body: string; authorName?: string }) =>
  withStore(file, (store) => {
    const changeId = randomUUID()
    const detail = commentBody(input.path, input.lineStart, input.lineEnd, input.text, input.body)
    const change: Change = {
      changeId,
      specialist: 'build',
      dependsOn: [],
      backlog: false,
      shortId: String(store.nextShortId++),
      projectId: 'local',
      stageId: 'local',
      groupId: null,
      title: input.body.replace(/\s+/g, ' ').slice(0, 300),
      body: detail,
      status: 'open',
      source: 'console',
      requestedBranch: null,
      route: null,
      gitSha: null,
      deploymentId: null,
      locale: null,
      viewport: null,
      capture: { stroke: [], bounds: null, elements: [{ testId: null, sourceAnchor: anchorOf(input.path, input.lineStart, input.lineEnd), cssPath: null, text: input.text?.slice(0, 2000) ?? null, rect: null } as never] },
      screenshotKey: null,
      branch: null,
      headCommit: null,
      resolvedAt: null,
      acknowledgedAt: null,
      resolvedBySandboxId: null,
      resolvedBySandboxSlug: null,
      createdAt: new Date(),
      held: false,
      heldUntil: null,
      screenshotUrl: null,
    } as Change
    store.changes.push(change)
    return { changeId, shortId: change.shortId }
  })

export const addReply = (file: string, input: { changeId: string; body: string; authorName?: string }) =>
  withStore(file, (store) => {
    const change = find(store, input.changeId)
    store.messages.push({ messageId: randomUUID(), changeId: change.changeId, authorKind: 'user', authorName: input.authorName ?? null, body: input.body, attachments: [], chosenOption: null, createdAt: new Date() })
    if (change.status === 'needs_answer') change.status = change.groupId ? 'in_progress' : 'open'
    else if (change.status === 'done') Object.assign(change, { status: 'open', resolvedAt: null, groupId: null })
    return { changeId: change.changeId }
  })

export const resolveThread = (file: string, changeId: string) =>
  withStore(file, (store) => {
    const change = find(store, changeId)
    change.status = 'dismissed'
    return { changeId }
  })
