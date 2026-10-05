import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import { open } from 'node:fs/promises'
import { join } from 'node:path'
import type { LogLevel, LogStore, NewLogEntry } from './log-store.js'

const ANSI = /\x1b\[[0-9;]*m/g
const REQUEST = /\b(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(\S+)(?:\s+(\d{3}))?/
const MILLIS = /(\d+(?:\.\d+)?)\s?ms\b/
const TRACE = /^\[([0-9a-f]{8}-\d+)\]|\b(?:errorId|traceId|trace)[=:]\s?([\w-]+)/i

export const levelOf = (text: string): LogLevel => {
  if (/\b(error|fatal|uncaught|unhandled|failed|exception)\b|^\s*at\s/i.test(text) || /Error:/.test(text)) return 'error'
  if (/\b(warn|warning|deprecated)\b/i.test(text)) return 'warn'
  return 'info'
}

export const parseLine = (text: string, source: string, at: number): NewLogEntry => {
  const request = text.match(REQUEST)
  const trace = text.match(TRACE)
  const ms = text.match(MILLIS)
  return {
    at,
    level: levelOf(text),
    source,
    wire: request ? 'http' : null,
    fn: request ? `${request[1]} ${request[2]}` : null,
    ms: ms ? Math.round(Number(ms[1])) : null,
    trace: trace ? (trace[1] ?? trace[2]) : null,
    text,
  }
}

const PINO: Record<number, LogLevel> = { 10: 'info', 20: 'info', 30: 'info', 40: 'warn', 50: 'error', 60: 'error' }

const pick = (o: Record<string, unknown>, ...names: string[]) => names.map((n) => o[n]).find((v) => v !== undefined && v !== null)

const levelFrom = (v: unknown): LogLevel | null => {
  if (typeof v === 'number') return PINO[v] ?? null
  const t = String(v ?? '').toLowerCase()
  return t.startsWith('err') || t === 'fatal' || t === 'critical' ? 'error' : t.startsWith('warn') ? 'warn' : t ? 'info' : null
}

const timeFrom = (v: unknown, fallback: number) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Date.parse(v) : NaN
  return Number.isFinite(n) ? (n < 1e11 ? n * 1000 : n) : fallback
}

const text = (v: unknown) => (typeof v === 'string' ? v : v === undefined || v === null ? '' : JSON.stringify(v))

export const parseJsonLine = (line: string, source: string, at: number): NewLogEntry | null => {
  if (line[0] !== '{') return null
  let o: Record<string, unknown>
  try {
    o = JSON.parse(line)
  } catch {
    return null
  }
  if (!o || typeof o !== 'object' || Array.isArray(o)) return null
  const message = text(pick(o, 'msg', 'message', 'text')) || text(pick(o, 'err', 'error'))
  if (!message) return null
  const stack = text(pick(o, 'stack'))
  const wire = pick(o, 'wire', 'wireType')
  const ms = pick(o, 'ms', 'durationMs', 'duration', 'responseTime')
  const fn = pick(o, 'fn', 'func', 'function', 'rpc', 'route')
  const trace = pick(o, 'trace', 'traceId', 'errorId', 'reqId')
  return {
    at: timeFrom(pick(o, 'time', 'timestamp', 'ts', '_timestamp'), at),
    level: levelFrom(pick(o, 'level', 'severity')) ?? levelOf(message),
    source: text(pick(o, 'source')) || source,
    wire: wire === undefined ? null : text(wire),
    fn: fn === undefined ? null : text(fn),
    ms: typeof ms === 'number' ? Math.round(ms) : null,
    trace: trace === undefined ? null : text(trace),
    text: stack ? `${message}\n${stack}` : message,
  }
}

export const entriesFrom = (chunk: string, source: string, at: number): NewLogEntry[] => {
  const out: NewLogEntry[] = []
  for (const raw of chunk.replace(ANSI, '').split('\n')) {
    if (!raw.trim()) continue
    const json = parseJsonLine(raw, source, at)
    if (json) {
      out.push(json)
      continue
    }
    const last = out[out.length - 1]
    if (last && /^\s+at\s/.test(raw)) {
      last.text += `\n${raw}`
      last.level = 'error'
      continue
    }
    out.push(parseLine(raw, source, at))
  }
  return out
}

export interface Forward {
  url: string
  auth?: string
}

const RUN_FILE = /^([0-9a-z]+)\.(.+)\.log$/
const KEEP_RUNS = 5
const KEEP_DAYS = 14
const KEEP_ROWS = 50_000
const PRUNE_EVERY = 600

export class LogCollector {
  private timer: ReturnType<typeof setInterval> | null = null
  private busy = false
  private sweeps = 0

  constructor(
    private home: string,
    private store: LogStore,
    private projects: () => Promise<string[]> = async () => [],
    private forward?: Forward
  ) {}

  start(every = 1000) {
    if (this.timer) return
    this.timer = setInterval(() => void this.sweep().catch(() => {}), every)
    this.timer.unref?.()
  }

  stop() {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  async sweep() {
    if (this.busy) return
    this.busy = true
    try {
      const root = join(this.home, 'logs')
      if (!existsSync(root)) return
      for (const key of readdirSync(root)) {
        const dir = join(root, key)
        if (!statSync(dir).isDirectory()) continue
        for (const file of readdirSync(dir)) {
          const match = file.match(RUN_FILE)
          if (match) await this.read(join(dir, file), key, match[2])
        }
      }
      if (this.sweeps++ % PRUNE_EVERY === 0) await this.prune(root).catch(() => {})
    } finally {
      this.busy = false
    }
  }

  private async read(path: string, key: string, source: string) {
    const size = statSync(path).size
    const from = await this.store.position(path)
    if (size <= from) return
    const handle = await open(path, 'r')
    try {
      const buffer = Buffer.alloc(size - from)
      await handle.read(buffer, 0, buffer.length, from)
      const text = buffer.toString('utf8')
      const complete = text.lastIndexOf('\n')
      if (complete === -1) return
      const position = from + Buffer.byteLength(text.slice(0, complete + 1))
      const entries = entriesFrom(text.slice(0, complete), source, Date.now())
      await this.store.append(key, entries, { file: path, position })
      if (entries.length) void this.send(key, entries).catch(() => {})
    } finally {
      await handle.close()
    }
  }

  private async prune(root: string) {
    const known = await this.projects()
    if (known.length) {
      await this.store.trim({ known, olderThan: Date.now() - KEEP_DAYS * 86_400_000, perProject: KEEP_ROWS })
      for (const key of readdirSync(root)) if (!known.includes(key)) rmSync(join(root, key), { recursive: true, force: true })
    }
    const gone: string[] = []
    for (const key of readdirSync(root)) {
      const dir = join(root, key)
      if (!existsSync(dir)) continue
      const runs = new Map<string, number>()
      for (const file of readdirSync(dir)) {
        const match = file.match(RUN_FILE)
        if (match) runs.set(match[1], Math.max(runs.get(match[1]) ?? 0, statSync(join(dir, file)).mtimeMs))
      }
      const old = [...runs].sort((x, y) => y[1] - x[1]).slice(KEEP_RUNS).map(([run]) => run)
      for (const file of readdirSync(dir)) {
        const match = file.match(RUN_FILE)
        if (!match || !old.includes(match[1])) continue
        const path = join(dir, file)
        if ((await this.store.position(path)) >= statSync(path).size) {
          rmSync(path, { force: true })
          gone.push(path)
        }
      }
    }
    await this.store.forget(gone)
  }

  private async send(key: string, entries: NewLogEntry[]) {
    if (!this.forward) return
    await fetch(this.forward.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(this.forward.auth ? { authorization: this.forward.auth } : {}) },
      body: JSON.stringify(entries.map((e) => ({ _timestamp: e.at * 1000, project: key, source: e.source, level: e.level, wire: e.wire, fn: e.fn, ms: e.ms, trace: e.trace, message: e.text }))),
    })
  }
}

export const forwardFromEnv = (env: NodeJS.ProcessEnv = process.env): Forward | undefined => {
  const base = env.PIKKU_STUDIO_OPENOBSERVE_URL?.replace(/\/+$/, '')
  if (!base) return undefined
  const stream = env.PIKKU_STUDIO_OPENOBSERVE_STREAM ?? 'studio'
  const org = env.PIKKU_STUDIO_OPENOBSERVE_ORG ?? 'default'
  const user = env.PIKKU_STUDIO_OPENOBSERVE_USER
  const password = env.PIKKU_STUDIO_OPENOBSERVE_PASSWORD
  return {
    url: `${base}/api/${org}/${stream}/_json`,
    auth: user && password ? `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}` : undefined,
  }
}
