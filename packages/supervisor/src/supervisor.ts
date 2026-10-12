import { spawn, execFileSync, type ChildProcess, type SpawnOptions } from 'node:child_process'
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { dirname } from 'node:path'
import { connect } from 'node:net'

export type ServiceState = 'starting' | 'ready' | 'restarting' | 'failed' | 'stopped'

export type SpawnFn = (command: string, args: string[], options: SpawnOptions) => ChildProcess

export type ServiceSpec = {
  name: string
  command: string
  args: string[]
  cwd: string
  env: Record<string, string>
  port: number
  logPath: string
  ready?: () => Promise<void>
  restart?: 'never' | 'on-crash'
  maxRestarts?: number
  spawn?: SpawnFn
  detached?: boolean
}

export type ServiceStatus = {
  name: string
  state: ServiceState
  port: number
  pid: number | null
  restarts: number
  lastExit: { code: number | null; signal: string | null; at: number } | null
  logTail: string
}

export type SupervisorEvent = { key: string; name: string; state: ServiceState; status: ServiceStatus }

export type SupervisorOptions = {
  pidFile?: string
  backoffMs?: number
  maxBackoffMs?: number
  stableMs?: number
  graceMs?: number
  readyTimeoutMs?: number
  pollMs?: number
  now?: () => number
  strayPattern?: RegExp
}

type Entry = {
  spec: ServiceSpec
  child: ChildProcess | null
  state: ServiceState
  restarts: number
  lastExit: ServiceStatus['lastExit']
  upSince: number
  stopping: boolean
  timer: NodeJS.Timeout | null
  abort: AbortController
  done: Promise<void>
  settle: (error?: Error) => void
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal?.addEventListener('abort', () => {
      clearTimeout(timer)
      resolve()
    })
  })

const signalTree = (child: ChildProcess, signal: NodeJS.Signals) => {
  try {
    if (child.pid) process.kill(-child.pid, signal)
    else child.kill(signal)
  } catch {
    try {
      child.kill(signal)
    } catch {}
  }
}

const tailOf = (path: string, lines = 20) => {
  try {
    return existsSync(path) ? readFileSync(path, 'utf8').trimEnd().split('\n').slice(-lines).join('\n') : ''
  } catch {
    return ''
  }
}

const id = (key: string, name: string) => `${key}/${name}`

export class Supervisor {
  private entries = new Map<string, Entry>()
  private listeners = new Set<(event: SupervisorEvent) => void>()
  private reaped = false
  private options: Required<Omit<SupervisorOptions, 'pidFile'>> & { pidFile?: string }

  constructor(options: SupervisorOptions = {}) {
    this.options = {
      backoffMs: 500,
      maxBackoffMs: 30_000,
      stableMs: 30_000,
      graceMs: 5_000,
      readyTimeoutMs: 180_000,
      pollMs: 100,
      now: Date.now,
      strayPattern: /pikku|vite|esbuild|sandbox-exec|bwrap|node|bun/,
      ...options,
    }
  }

  onChange(listener: (event: SupervisorEvent) => void) {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  async start(key: string, spec: ServiceSpec): Promise<ServiceStatus> {
    const existing = this.entries.get(id(key, spec.name))
    if (existing && (existing.state === 'starting' || existing.state === 'ready' || existing.state === 'restarting')) {
      await existing.done
      return this.snapshot(existing)
    }
    await this.reapStrays()
    let settle!: Entry['settle']
    const done = new Promise<void>((resolve, reject) => {
      settle = (error) => (error ? reject(error) : resolve())
    })
    done.catch(() => {})
    const entry: Entry = {
      spec,
      child: null,
      state: 'starting',
      restarts: 0,
      lastExit: null,
      upSince: 0,
      stopping: false,
      timer: null,
      abort: new AbortController(),
      done,
      settle,
    }
    this.entries.set(id(key, spec.name), entry)
    this.emit(key, entry)
    this.launch(key, entry)
    await done
    return this.snapshot(entry)
  }

  async stop(key: string, name: string) {
    const entry = this.entries.get(id(key, name))
    if (!entry) return
    entry.stopping = true
    if (entry.timer) clearTimeout(entry.timer)
    entry.abort.abort()
    const child = entry.child
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = new Promise<void>((resolve) => child.once('exit', () => resolve()))
      signalTree(child, 'SIGTERM')
      const grace = new AbortController()
      await Promise.race([exited, sleep(this.options.graceMs, grace.signal)])
      grace.abort()
    }
    if (child) signalTree(child, 'SIGKILL')
    this.forgetPid(key, name)
    entry.child = null
    entry.settle(new Error(`${name} was stopped`))
    this.set(key, entry, 'stopped')
  }

  async stopAll(key: string) {
    const names = [...this.entries].filter(([k]) => k.startsWith(`${key}/`)).map(([, entry]) => entry.spec.name)
    await Promise.all(names.map((name) => this.stop(key, name)))
  }

  status(key: string, name: string): ServiceStatus | null {
    const entry = this.entries.get(id(key, name))
    return entry ? this.snapshot(entry) : null
  }

  list(key: string): ServiceStatus[] {
    return [...this.entries].filter(([k]) => k.startsWith(`${key}/`)).map(([, entry]) => this.snapshot(entry))
  }

  async reapStrays() {
    if (this.reaped || !this.options.pidFile) return
    this.reaped = true
    const recorded = this.readPids()
    for (const pid of Object.values(recorded)) {
      if (pid > 1 && this.ours(pid)) {
        try {
          process.kill(-pid, 'SIGKILL')
        } catch {}
      }
    }
    this.writePids({})
  }

  private launch(key: string, entry: Entry) {
    const { spec } = entry
    const generation = entry.abort
    mkdirSync(dirname(spec.logPath), { recursive: true })
    const log = openSync(spec.logPath, 'a')
    let child: ChildProcess
    try {
      child = (spec.spawn ?? spawn)(spec.command, spec.args, {
        cwd: spec.cwd,
        env: spec.env,
        detached: spec.detached ?? true,
        stdio: ['ignore', log, log],
      })
    } finally {
      closeSync(log)
    }
    entry.child = child
    this.recordPid(key, spec.name, child)
    let exitedEarly = false
    let wasReady = false
    const exit = new Promise<void>((resolve) => {
      child.once('error', () => {})
      child.once('exit', (code, signal) => {
        exitedEarly = true
        entry.lastExit = { code, signal, at: this.options.now() }
        this.forgetPid(key, spec.name)
        resolve()
        if (entry.child === child) entry.child = null
        if (entry.stopping) return
        signalTree(child, 'SIGKILL')
        this.crashed(key, entry, wasReady)
      })
    })
    exit.then(() => generation.abort())
    const ready = spec.ready ? spec.ready() : this.waitForPort(spec.port, generation.signal)
    ready.then(
      () => {
        if (exitedEarly || entry.stopping || entry.child !== child) return
        wasReady = true
        entry.upSince = this.options.now()
        this.set(key, entry, 'ready')
        entry.settle()
      },
      () => {
        if (exitedEarly || entry.stopping || entry.child !== child) return
        signalTree(child, 'SIGKILL')
      },
    )
  }

  private crashed(key: string, entry: Entry, wasReady: boolean) {
    const { spec } = entry
    const first = entry.state === 'starting'
    if (first || spec.restart !== 'on-crash') {
      this.set(key, entry, 'failed')
      entry.settle(new Error(`${spec.name} stopped while starting:\n${tailOf(spec.logPath)}`))
      return
    }
    if (wasReady && entry.upSince && this.options.now() - entry.upSince >= this.options.stableMs) entry.restarts = 0
    if (entry.restarts >= (spec.maxRestarts ?? 5)) {
      this.set(key, entry, 'failed')
      return
    }
    entry.restarts++
    this.set(key, entry, 'restarting')
    const delay = Math.min(this.options.backoffMs * 2 ** (entry.restarts - 1), this.options.maxBackoffMs)
    entry.abort = new AbortController()
    entry.timer = setTimeout(() => {
      entry.timer = null
      if (!entry.stopping) this.launch(key, entry)
    }, delay)
  }

  private async waitForPort(port: number, signal: AbortSignal) {
    const deadline = this.options.now() + this.options.readyTimeoutMs
    while (this.options.now() < deadline && !signal.aborted) {
      const up = await new Promise<boolean>((done) => {
        const socket = connect(port, '127.0.0.1')
        socket.once('connect', () => {
          socket.destroy()
          done(true)
        })
        socket.once('error', () => done(false))
      })
      if (up) return
      await sleep(this.options.pollMs, signal)
    }
    throw new Error(`Nothing is listening on port ${port}`)
  }

  private snapshot(entry: Entry): ServiceStatus {
    return {
      name: entry.spec.name,
      state: entry.state,
      port: entry.spec.port,
      pid: entry.child?.pid ?? null,
      restarts: entry.restarts,
      lastExit: entry.lastExit,
      logTail: tailOf(entry.spec.logPath),
    }
  }

  private set(key: string, entry: Entry, state: ServiceState) {
    if (entry.state === state) return
    entry.state = state
    this.emit(key, entry)
  }

  private emit(key: string, entry: Entry) {
    const status = this.snapshot(entry)
    for (const listener of this.listeners) listener({ key, name: entry.spec.name, state: entry.state, status })
  }

  private ours(pid: number) {
    try {
      return this.options.strayPattern.test(execFileSync('ps', ['-o', 'command=', '-p', String(pid)], { encoding: 'utf8' }))
    } catch {
      return false
    }
  }

  private readPids(): Record<string, number> {
    try {
      return JSON.parse(readFileSync(this.options.pidFile!, 'utf8'))
    } catch {
      return {}
    }
  }

  private writePids(pids: Record<string, number>) {
    try {
      if (Object.keys(pids).length === 0) return unlinkSync(this.options.pidFile!)
      mkdirSync(dirname(this.options.pidFile!), { recursive: true })
      writeFileSync(this.options.pidFile!, JSON.stringify(pids))
    } catch {}
  }

  private recordPid(key: string, name: string, child: ChildProcess) {
    if (!this.options.pidFile || !child.pid) return
    this.writePids({ ...this.readPids(), [id(key, name)]: child.pid })
  }

  private forgetPid(key: string, name: string) {
    if (!this.options.pidFile) return
    const { [id(key, name)]: _, ...rest } = this.readPids()
    this.writePids(rest)
  }
}
