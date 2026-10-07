import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { offerMessage, pikkuNext, routeMessage, writePikkuShim, type CommandRunner } from './changes.js'
import { piArgs, piEnv, resolvePi, type BuilderAi, type BuilderMode } from './pi.js'
import { builderHome, writeSkills } from './skills.js'

const routerEnv = (launch: { env?: Record<string, string>; queueHome?: string }) => (launch.queueHome ? { ...launch.env, HOME: launch.queueHome } : launch.env)

export type BuilderItem =
  | { kind: 'user'; text: string; at: number }
  | { kind: 'assistant'; text: string; at: number }
  | { kind: 'tool'; id: string; name: string; summary: string; status: 'running' | 'done' | 'error'; at: number }
  | { kind: 'error'; text: string; at: number }
  | { kind: 'loop'; text: string; at: number }
  | { kind: 'navigate'; screen: string; id?: string; title?: string; at: number }

export interface BuilderConversation {
  session: string
  title: string
  at: number
  current: boolean
}

export interface BuilderState {
  busy: boolean
  items: BuilderItem[]
  session: string
}

export type Launcher = (command: string, args: string[], options: { cwd: string; env: NodeJS.ProcessEnv }) => ChildProcess

export interface BuilderLaunch {
  cwd: string
  ai?: BuilderAi
  env?: Record<string, string>
  apiUrl?: string
  healDir?: string
  queueHome?: string
  apps?: { slug: string; url: string }[]
  loop?: boolean
  launch?: Launcher
  run?: CommandRunner
}

const spawnPi: Launcher = (command, args, options) => spawn(command, args, { ...options, stdio: ['pipe', 'pipe', 'pipe'] })

const summarize = (args: unknown): string => {
  if (!args || typeof args !== 'object') return ''
  const a = args as Record<string, unknown>
  const pick = a.path ?? a.file_path ?? a.command ?? a.pattern ?? a.url
  if (typeof pick === 'string') return pick.length > 120 ? `${pick.slice(0, 117)}…` : pick
  if (Array.isArray(a.files)) return a.files.map((f) => (f && typeof f === 'object' ? (f as any).path : '')).filter(Boolean).join(', ')
  return ''
}

interface Turn {
  child: ChildProcess
  promptId: number
  tools: number
  role?: 'explore'
}

interface Drive {
  gen: number
  turns: number
  quiet: number
  report: string
  repeats: number
}

export const MAX_DRIVEN_TURNS = 25

const FALLBACK_BRIEFS = [
  'A calm, spacious layout with one big focus per screen, soft pastel colour, friendly and reassuring in tone.',
  'A dense, dashboard-like layout with lots of information at a glance, a dark theme with one sharp accent colour, efficient and serious in tone.',
  'A bold, editorial layout with oversized type and strong blocks of saturated colour, confident and playful in tone.',
  'A warm, tactile layout with cards and rounded shapes, earthy natural colours, personal and handmade in tone.',
]

const PLAN_PROMPT = (count: number, idea: string) =>
  `Plan ${count} design directions for the app below. Reply with only a JSON array of ${count} strings and nothing else. Each string is a brief of two or three plain sentences for one designer: the layout idea, the colour world, and the tone. The directions must differ from each other as much as possible in all three. No two may share a layout idea or a main colour. Do not write any files.\n\n${idea}`

const DIRECTION_PROMPT = (n: number, count: number, idea: string, brief: string) =>
  `${idea}\n\nYou are making direction ${n} of ${count}. Other designers are making the other directions at the same time, so stay strictly with your own brief and do not echo theirs:\n${brief}\n\nWrite only artifacts/direction-${n}/index.html, one self-contained page (inline CSS, no scripts, no external files), and artifacts/direction-${n}/artifact.json as {"kind":"Design","title":"a short name for the direction","summary":"one plain sentence an owner would use about what makes it different","exploration":"first","mode":"extreme"}. Write both files straight away, before reading or checking anything. Do not take screenshots or run review commands. Do not change the app.`

const parseBriefs = (output: string, count: number): string[] | null => {
  const match = output.match(/\[[\s\S]*\]/)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[0])
    const briefs = Array.isArray(parsed) ? parsed.filter((b): b is string => typeof b === 'string' && b.trim().length > 0) : []
    return briefs.length >= count ? briefs.slice(0, count) : null
  } catch {
    return null
  }
}

const HEAL_PROMPT = 'This project will not start. Get it running again as fast as you can, with the smallest change that works. Do not add features or tidy anything. Check it with `pikku all`, commit the fix, then call report_fix and stop. Here is what went wrong:'

export class BuilderSession {
  private states = new Map<string, BuilderState>()
  private turns = new Map<string, Turn>()
  private drives = new Map<string, Drive>()
  private modes = new Map<string, BuilderMode>()

  constructor(
    private resolve: (key: string, mode?: BuilderMode) => Promise<BuilderLaunch>,
    private home = builderHome()
  ) {}

  private file(key: string) {
    return join(this.home, 'transcripts', `${key}.json`)
  }

  isBusy(key: string): boolean {
    return this.states.get(key)?.busy ?? false
  }

  async state(key: string): Promise<BuilderState> {
    const cached = this.states.get(key)
    if (cached) return cached
    const path = this.file(key)
    const saved = existsSync(path) ? JSON.parse(await readFile(path, 'utf8')) : {}
    const state: BuilderState = { busy: false, items: saved.items ?? [], session: saved.session ?? `pikku-${key}` }
    this.states.set(key, state)
    return state
  }

  private async save(key: string) {
    const state = await this.state(key)
    await mkdir(join(this.home, 'transcripts'), { recursive: true })
    await writeFile(this.file(key), JSON.stringify({ session: state.session, items: state.items }))
  }

  private drive(key: string): Drive {
    let drive = this.drives.get(key)
    if (!drive) this.drives.set(key, (drive = { gen: 0, turns: 0, quiet: 0, report: '', repeats: 0 }))
    return drive
  }

  async prompt(key: string, message: string, context?: string, mode: BuilderMode = 'build', offer = false): Promise<BuilderState> {
    const text = message.trim()
    if (!text) throw new Error('Say what you want built first')
    const state = await this.state(key)
    const logDir = process.env.PIKKU_BUILDER_RUN_LOG
    if (logDir) {
      await mkdir(logDir, { recursive: true })
      await writeFile(join(logDir, `${key}-prompt-${mode}-${Date.now()}.log`), `label=prompt-${mode} key=${key} start=${Date.now()}\n`).catch(() => undefined)
    }
    state.items.push({ kind: 'user', text, at: Date.now() })
    const request = context ? `${text}\n\n<context>${context}</context>` : text
    if (this.turns.has(key)) {
      const running = this.modes.get(key) ?? 'build'
      if (running !== mode) {
        state.items.pop()
        throw new Error(`The builder is busy with ${running} work. Wait for it to finish first.`)
      }
      await this.send(key, request)
      return state
    }
    this.modes.set(key, mode)
    this.drives.set(key, { gen: this.drive(key).gen + 1, turns: 0, quiet: 0, report: '', repeats: 0 })
    state.busy = true
    try {
      if (mode !== 'build' || offer) {
        await this.send(key, mode === 'build' ? offerMessage(request) : request)
        return state
      }
      const { cwd, env, run } = await this.resolve(key, mode)
      const route = await pikkuNext(cwd, request, run, env)
      await this.send(key, routeMessage(route))
    } catch (error) {
      state.busy = false
      this.push(key, `Pikku could not take the request: ${error instanceof Error ? error.message : String(error)}`)
      await this.save(key)
    }
    return state
  }

  private async send(key: string, sent: string, session?: string, role?: 'explore') {
    const state = await this.state(key)
    const running = this.turns.get(key)
    if (running) {
      running.promptId += 1
      running.child.stdin?.write(`${JSON.stringify({ type: 'follow_up', id: `r${running.promptId}`, message: sent })}\n`)
      await this.save(key)
      return
    }
    const gen = this.drive(key).gen
    const mode = role ? 'build' : (this.modes.get(key) ?? 'build')
    const resolved = await this.resolve(key, mode)
    const { ai, env = {}, launch = spawnPi, queueHome } = resolved
    const cwd = resolved.cwd
    const skills = await writeSkills(this.home)
    const shims = await writePikkuShim(this.home, queueHome)
    const child = launch(process.execPath, [resolvePi(), ...piArgs({ ai, skills, mode: 'rpc', session: session ?? state.session, role, scope: mode })], {
      cwd,
      env: { ...process.env, ...env, ...piEnv(ai), PATH: `${shims}:${env.PATH ?? process.env.PATH ?? ''}` },
    })
    const turn: Turn = { child, promptId: 1, tools: 0, role }
    this.turns.set(key, turn)
    state.busy = true
    let stderr = ''
    child.stderr?.on('data', (chunk) => (stderr = (stderr + chunk).slice(-4000)))
    createInterface({ input: child.stdout! }).on('line', (line) => this.onEvent(key, line))
    child.once('error', (error) => this.push(key, `The builder could not start: ${error.message}`))
    child.once('exit', (code, signal) => {
      if (this.turns.get(key) === turn) this.turns.delete(key)
      state.busy = false
      if (code && state.items.at(-1)?.kind !== 'error') {
        const lines = stderr.trim().split('\n')
        const text = (lines.length > 8 ? [...lines.slice(0, 3), '...', ...lines.slice(-4)] : lines).join('\n')
        console.error(`[builder] ${key} exited code=${code} signal=${signal ?? ''}: ${stderr.trim().slice(-500)}`)
        this.push(key, `${text ? `${text}\n` : ''}The builder stopped (exit ${code}).`)
      }
      for (const item of state.items) if (item.kind === 'tool' && item.status === 'running') item.status = 'error'
      const drive = this.drive(key)
      drive.quiet = turn.tools === 0 ? drive.quiet + 1 : 0
      void this.save(key)
      if (!code && !role && mode === 'build' && drive.gen === gen) void this.advance(key, gen)
    })
    child.stdin?.write(`${JSON.stringify({ type: 'prompt', id: 'r1', message: sent })}\n`)
    await this.save(key)
  }

  private async roleTurn(key: string, message: string, role: 'explore', empty: string): Promise<BuilderState> {
    const text = message.trim()
    if (!text) throw new Error(empty)
    const state = await this.state(key)
    if (this.turns.get(key)?.role === role) {
      state.items.push({ kind: 'user', text, at: Date.now() })
      await this.send(key, text)
      return state
    }
    if (state.busy || this.turns.has(key)) throw new Error('The builder is already working')
    state.items.push({ kind: 'user', text, at: Date.now() })
    state.busy = true
    try {
      await this.send(key, text, `pikku-${role}-${key}-${Date.now()}`, role)
    } catch (error) {
      state.busy = false
      this.push(key, `Pikku could not take the request: ${error instanceof Error ? error.message : String(error)}`)
      await this.save(key)
    }
    return state
  }

  async say(key: string, text: string) {
    const state = await this.state(key)
    state.items.push({ kind: 'assistant', text, at: Date.now() })
    await this.save(key)
  }

  explore(key: string, message: string) {
    return this.roleTurn(key, message, 'explore', 'Say what you want explored first')
  }

  private async runOnce(key: string, prompt: string, timeoutMs: number, role: 'explore' | 'inspect' = 'explore', label: string = role): Promise<{ ok: boolean; output: string }> {
    const startedAt = Date.now()
    const { cwd, ai, env = {}, launch = spawnPi } = await this.resolve(key)
    const skills = await writeSkills(this.home)
    const child = launch(process.execPath, [resolvePi(), '-p', ...piArgs({ ai, skills, role, session: `pikku-${role}-${key}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }), prompt], {
      cwd,
      env: { ...process.env, ...env, ...piEnv(ai) },
    })
    let output = ''
    let full = ''
    const logDir = process.env.PIKKU_BUILDER_RUN_LOG
    child.stdout?.on('data', (chunk) => {
      output = (output + chunk).slice(-20_000)
      if (logDir) full += `[out] ${chunk}`
    })
    child.stderr?.on('data', (chunk) => {
      output = (output + chunk).slice(-20_000)
      if (logDir) full += `[err] ${chunk}`
    })
    child.stdin?.end()
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill()
    }, timeoutMs)
    const result = await new Promise<{ code: number | null; signal: NodeJS.Signals | null; error?: string }>((resolve) => {
      child.once('error', (error) => resolve({ code: 1, signal: null, error: error.message }))
      child.once('exit', (code, signal) => resolve({ code, signal }))
    })
    clearTimeout(timer)
    const code = result.code
    if (logDir) {
      await mkdir(logDir, { recursive: true })
      await writeFile(join(logDir, `${key}-${label}-${startedAt}.log`), `label=${label} key=${key} start=${startedAt} ms=${Date.now() - startedAt} code=${code} signal=${result.signal} timedOut=${timedOut} error=${result.error ?? ''}\n${full}`).catch(() => undefined)
    }
    return { ok: code === 0, output }
  }

  async inspect(key: string, files: { name: string; path: string }[]): Promise<boolean> {
    const list = files.map((f) => `- ${f.name}: ${f.path}`).join('\n')
    const prompt = `The owner attached these files to a new project:\n${list}\n\nRead each one. For every file write knowledge/attachments/<short-name>.md: markdown with frontmatter holding type: reference, title, description (one plain sentence), tags (a few words), and resource: content:attachments/<file name exactly as listed>. The body is a short summary and the key facts someone designing an app around this file needs: names, numbers, structure, wording, style. Then write knowledge/attachments/index.md with the same frontmatter shape (no resource) and a body that lists every file with one sentence each. Reply when done.`
    return (await this.runOnce(key, prompt, 10 * 60_000, 'inspect')).ok
  }

  async directions(key: string, idea: string, count = 4, context?: string): Promise<number> {
    const text = idea.trim()
    if (!text) throw new Error('Say what you want explored first')
    const state = await this.state(key)
    if (state.busy || this.turns.has(key)) throw new Error('The builder is already working')
    state.items.push({ kind: 'user', text, at: Date.now() })
    state.busy = true
    try {
      const full = context ? `${text}\n\n${context}` : text
      const planned = await this.runOnce(key, PLAN_PROMPT(count, full), 3 * 60_000, 'explore', 'plan')
      const briefs = (planned.ok ? parseBriefs(planned.output, count) : null) ?? FALLBACK_BRIEFS.slice(0, count)
      const made = await this.makeDirections(key, briefs, count, full)
      const ok = made.filter((r) => r.ok).length
      if (!ok) throw new Error(made[0]?.output.trim().split('\n').slice(-4).join('\n') || 'The builder could not make any directions.')
      return ok
    } catch (error) {
      this.push(key, `Pikku could not take the request: ${error instanceof Error ? error.message : String(error)}`)
      throw error
    } finally {
      state.busy = false
      await this.save(key)
    }
  }

  private async makeDirections(key: string, briefs: string[], count: number, full: string) {
    const modeFile = process.env.PIKKU_DIRECTIONS_MODE_FILE
    const how = (modeFile && existsSync(modeFile) ? (await readFile(modeFile, 'utf8')).trim() : process.env.PIKKU_DIRECTIONS_MODE) || 'parallel'
    const one = (i: number) => this.runOnce(key, DIRECTION_PROMPT(i + 1, count, full, briefs[i]), 10 * 60_000, 'explore', `direction-${i + 1}`)
    if (how === 'sequential') {
      const made: { ok: boolean; output: string }[] = []
      for (let i = 0; i < briefs.length; i++) made.push(await one(i))
      return made
    }
    if (how === 'staggered') return Promise.all(briefs.map(async (_, i) => (await new Promise((r) => setTimeout(r, i * 10_000)), one(i))))
    if (how === 'single') {
      const list = briefs.map((brief, i) => `Direction ${i + 1}: ${brief}`).join('\n')
      const prompt = `${full}\n\nMake ${count} design directions, one after the other, each strictly with its own brief:\n${list}\n\nFor each direction n write only artifacts/direction-n/index.html, one self-contained page (inline CSS, no scripts, no external files), and artifacts/direction-n/artifact.json as {"kind":"Design","title":"a short name for the direction","summary":"one plain sentence an owner would use about what makes it different","exploration":"first","mode":"extreme"}. Write the files straight away. Do not change the app.`
      return [await this.runOnce(key, prompt, 20 * 60_000, 'explore', 'single')]
    }
    return Promise.all(briefs.map((_, i) => one(i)))
  }

  async heal(key: string, problem: string, timeoutMs = 5 * 60_000): Promise<{ ok: boolean; summary: string }> {
    const { cwd, ai, env = {}, launch = spawnPi, healDir } = await this.resolve(key)
    const skills = await writeSkills(this.home)
    await mkdir(healDir ?? tmpdir(), { recursive: true })
    const report = join(await mkdtemp(join(healDir ?? tmpdir(), 'heal-')), 'report.json')
    const prompt = `${HEAL_PROMPT}\n\n${problem}`
    const child = launch(process.execPath, [resolvePi(), '-p', ...piArgs({ ai, skills, session: `pikku-heal-${key}-${Date.now()}` }), prompt], {
      cwd,
      env: { ...process.env, ...env, ...piEnv(ai), PIKKU_HEAL_REPORT: report },
    })
    let output = ''
    child.stdout?.on('data', (chunk) => (output = (output + chunk).slice(-4000)))
    child.stderr?.on('data', (chunk) => (output = (output + chunk).slice(-4000)))
    child.stdin?.end()
    const timer = setTimeout(() => child.kill(), timeoutMs)
    const code = await new Promise<number | null>((resolve) => {
      child.once('error', () => resolve(1))
      child.once('exit', resolve)
    })
    clearTimeout(timer)
    const saved = existsSync(report) ? JSON.parse(await readFile(report, 'utf8')) : null
    if (saved) return { ok: saved.fixed === true, summary: saved.summary }
    return { ok: false, summary: code === 0 ? 'The helper stopped without saying whether it fixed it.' : output.trim().split('\n').slice(-4).join('\n') || 'The helper could not run.' }
  }

  private note(key: string, text: string) {
    this.states.get(key)?.items.push({ kind: 'loop', text, at: Date.now() })
  }

  async startChanges(key: string, onlyNew = false): Promise<{ started: boolean; reason: string }> {
    const state = await this.state(key)
    if (state.busy || this.turns.has(key)) return { started: false, reason: 'The builder is already working' }
    const launch = await this.resolve(key)
    const route = await pikkuNext(launch.cwd, undefined, launch.run, routerEnv(launch))
    if (!route.agent) return { started: false, reason: route.reason }
    const drive = this.drive(key)
    const same = route.context === drive.report
    if (onlyNew && same && (drive.repeats >= 1 || drive.quiet >= 2)) return { started: false, reason: 'No new work since the last turn' }
    this.drives.set(key, { gen: drive.gen + 1, turns: 1, quiet: same ? drive.quiet : 0, report: route.context ?? '', repeats: same ? drive.repeats + 1 : 0 })
    this.note(key, route.reason)
    await this.send(key, routeMessage(route))
    return { started: true, reason: route.reason }
  }

  private async advance(key: string, gen: number): Promise<void> {
    const state = await this.state(key)
    const drive = this.drive(key)
    const launch = await this.resolve(key).catch(() => null)
    if (!launch || launch.loop === false) return
    if (drive.quiet >= 2) {
      this.note(key, 'The builder stopped: two turns in a row did nothing')
      return void (await this.save(key))
    }
    state.busy = true
    try {
      const route = await pikkuNext(launch.cwd, undefined, launch.run, routerEnv(launch))
      if (this.drive(key).gen !== gen) return
      for (const line of route.merged) this.note(key, `Merged ${line}`)
      if (!route.agent) {
        if (route.reason !== 'Nothing to do') this.note(key, route.reason)
        return
      }
      drive.repeats = route.context === drive.report ? drive.repeats + 1 : 0
      drive.report = route.context ?? ''
      drive.turns += 1
      if (drive.turns > MAX_DRIVEN_TURNS || drive.repeats >= 2) {
        this.note(key, `${route.reason} — stopped after ${drive.turns - 1} turns`)
        return
      }
      this.note(key, route.reason)
      state.busy = false
      await this.send(key, routeMessage(route), `${state.session}-${drive.turns}`)
    } catch (error) {
      this.push(key, `The build loop failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      if (!this.turns.has(key)) state.busy = false
      await this.save(key)
    }
  }

  private push(key: string, text: string) {
    this.states.get(key)?.items.push({ kind: 'error', text, at: Date.now() })
  }

  private onEvent(key: string, line: string) {
    let event: Record<string, any>
    try {
      event = JSON.parse(line)
    } catch {
      return
    }
    const state = this.states.get(key)
    if (!state) return
    const last = state.items.at(-1)
    if (event.type === 'message_update' && event.assistantMessageEvent?.type === 'text_delta') {
      const delta = String(event.assistantMessageEvent.delta ?? '')
      if (last?.kind === 'assistant') last.text += delta
      else state.items.push({ kind: 'assistant', text: delta, at: Date.now() })
    } else if (event.type === 'tool_execution_start') {
      const turn = this.turns.get(key)
      if (turn) turn.tools += 1
      state.items.push({
        kind: 'tool',
        id: String(event.toolCallId ?? state.items.length),
        name: String(event.toolName ?? 'tool'),
        summary: summarize(event.args),
        status: 'running',
        at: Date.now(),
      })
    } else if (event.type === 'tool_execution_end') {
      const id = event.toolCallId == null ? null : String(event.toolCallId)
      const tool = state.items.findLast((i) => i.kind === 'tool' && (id === null || i.id === id))
      if (tool?.kind === 'tool') tool.status = event.isError ? 'error' : 'done'
      const navigate = event.isError ? null : event.result?.details?.navigate
      if (navigate?.screen) state.items.push({ kind: 'navigate', ...navigate, at: Date.now() })
    } else if (event.type === 'message_end' && event.message?.stopReason === 'error') {
      this.push(key, String(event.message?.errorMessage ?? 'The model returned an error'))
    } else if (event.type === 'response' && event.success === false) {
      this.push(key, String(event.error ?? 'The builder refused the message'))
    } else if (event.type === 'agent_end') {
      this.turns.get(key)?.child.stdin?.end()
      void this.save(key)
    }
  }

  cancel(key: string) {
    this.drive(key).gen += 1
    const turn = this.turns.get(key)
    if (!turn) return
    turn.child.stdin?.write(`${JSON.stringify({ type: 'abort', id: 'abort' })}\n`)
    setTimeout(() => turn.child.kill(), 3000).unref()
  }

  private archive(key: string, session?: string) {
    if (session && !/^[\w-]+$/.test(session)) throw new Error('Unknown conversation')
    return session ? join(this.home, 'transcripts', key, `${session}.json`) : join(this.home, 'transcripts', key)
  }

  private async stash(key: string) {
    const state = await this.state(key)
    if (!state.items.length) return
    await mkdir(this.archive(key), { recursive: true })
    await writeFile(this.archive(key, state.session), JSON.stringify({ session: state.session, items: state.items }))
  }

  async conversations(key: string): Promise<BuilderConversation[]> {
    const state = await this.state(key)
    const describe = (session: string, items: BuilderItem[], current: boolean): BuilderConversation => ({
      session,
      current,
      title: (items.find((i) => i.kind === 'user') as { text: string } | undefined)?.text.split('\n')[0]!.slice(0, 80) ?? '',
      at: items.at(-1)?.at ?? 0,
    })
    const dir = this.archive(key)
    const files = existsSync(dir) ? (await readdir(dir)).filter((f) => f.endsWith('.json')) : []
    const past = await Promise.all(
      files.map(async (file) => {
        const saved = JSON.parse(await readFile(join(dir, file), 'utf8'))
        return describe(saved.session, saved.items ?? [], false)
      })
    )
    return [
      ...(state.items.length ? [describe(state.session, state.items, true)] : []),
      ...past.filter((c) => c.session !== state.session).sort((a, b) => b.at - a.at),
    ]
  }

  async resume(key: string, session: string): Promise<BuilderState> {
    const state = await this.state(key)
    if (state.busy) throw new Error('Wait for the builder to finish, or stop it, before switching conversations')
    if (session === state.session) return state
    const path = this.archive(key, session)
    if (!existsSync(path)) throw new Error('Unknown conversation')
    const saved = JSON.parse(await readFile(path, 'utf8'))
    await this.stash(key)
    this.cancel(key)
    await rm(path)
    this.states.set(key, { busy: false, items: saved.items ?? [], session: saved.session })
    await this.save(key)
    return this.state(key)
  }

  async forget(key: string, session: string) {
    const state = await this.state(key)
    if (session === state.session) return this.clear(key, false)
    await rm(this.archive(key, session), { force: true })
  }

  async clear(key: string, keep = true) {
    this.cancel(key)
    if (keep) await this.stash(key)
    this.states.set(key, { busy: false, items: [], session: `pikku-${key}-${Date.now()}` })
    await this.save(key)
  }
}
