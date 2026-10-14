import { createHash, timingSafeEqual } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Logger } from '@pikku/core/services'
import type { Studio } from './studio.js'

export const SLEEP_CHECKS = ['access', 'builder'] as const

export type SleepCheck = (typeof SLEEP_CHECKS)[number]

export interface SleepSettings {
  idleMinutes: number
  checks: Record<SleepCheck, boolean>
}

export interface SleepBlocker {
  check: SleepCheck
  reason: string
}

export const DEFAULT_SLEEP_SETTINGS: SleepSettings = { idleMinutes: 15, checks: { access: true, builder: true } }

let lastAccessAt = Date.now()
let openConnections = 0

export const recordAccess = (at = Date.now()) => {
  lastAccessAt = Math.max(lastAccessAt, at)
}

export const holdConnection = () => {
  openConnections += 1
  recordAccess()
  let released = false
  return () => {
    if (released) return
    released = true
    openConnections -= 1
    recordAccess()
  }
}

export const accessState = () => ({ lastAccessAt, openConnections })

export const holdWhileStreaming = (response: Response): Response => {
  if (!response.body) return response
  const release = holdConnection()
  const reader = response.body.getReader()
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { done, value } = await reader.read()
        if (done) {
          release()
          controller.close()
        } else controller.enqueue(value)
      } catch (error) {
        release()
        controller.error(error)
      }
    },
    cancel(reason) {
      release()
      return reader.cancel(reason)
    },
  })
  return new Response(body, { status: response.status, statusText: response.statusText, headers: response.headers })
}

export const sleepSettings = async (studio: Studio): Promise<SleepSettings> => {
  const { sleep } = (await studio.settings.read()) as { sleep?: Partial<SleepSettings> }
  return {
    idleMinutes: sleep?.idleMinutes ?? DEFAULT_SLEEP_SETTINGS.idleMinutes,
    checks: { ...DEFAULT_SLEEP_SETTINGS.checks, ...sleep?.checks },
  }
}

export const setSleepSettings = async (studio: Studio, patch: { idleMinutes?: number; checks?: Partial<SleepSettings['checks']> }): Promise<SleepSettings> => {
  const current = await sleepSettings(studio)
  const sleep = { idleMinutes: patch.idleMinutes ?? current.idleMinutes, checks: { ...current.checks, ...patch.checks } }
  await studio.settings.update({ sleep } as object)
  return sleep
}

const minutes = (ms: number) => {
  const m = Math.floor(ms / 60_000)
  return m < 1 ? 'less than a minute' : m === 1 ? '1 minute' : `${m} minutes`
}

export const sleepBlockers = (input: {
  settings: SleepSettings
  now: number
  lastAccessAt: number
  openConnections: number
  busyProjects: string[]
}): SleepBlocker[] => {
  const { settings, now } = input
  const blockers: SleepBlocker[] = []
  if (settings.checks.access) {
    if (input.openConnections > 0) {
      blockers.push({
        check: 'access',
        reason: input.openConnections === 1 ? '1 open connection' : `${input.openConnections} open connections`,
      })
    } else if (now - input.lastAccessAt < settings.idleMinutes * 60_000) {
      blockers.push({ check: 'access', reason: `Studio was used ${minutes(now - input.lastAccessAt)} ago` })
    }
  }
  if (settings.checks.builder) {
    for (const key of input.busyProjects) blockers.push({ check: 'builder', reason: `The builder is working in ${key}` })
  }
  return blockers
}

const busyProjects = async (studio: Studio) => {
  const keys = await studio.projects.keys()
  const busy = await Promise.all(keys.map(async (key) => ((await studio.builder.state(key)).busy ? key : null)))
  return busy.filter((key): key is string => key !== null)
}

export const sleepReadiness = async (studio: Studio, now = Date.now()) => {
  const blockers = sleepBlockers({
    settings: await sleepSettings(studio),
    now,
    ...accessState(),
    busyProjects: await busyProjects(studio),
  })
  return { canSleep: blockers.length === 0, blockers }
}

export const idleServers = (input: {
  open: string[]
  busy: string[]
  idleFor: (key: string) => number
  idleMinutes: number
  keeping: boolean
}): string[] => {
  if (input.keeping) return []
  const busy = new Set(input.busy)
  return input.open.filter((key) => !busy.has(key) && input.idleFor(key) >= input.idleMinutes * 60_000)
}

export const stopIdleServers = async (studio: Studio, logger: Logger) => {
  const idle = idleServers({
    open: studio.projects.openKeys(),
    busy: await busyProjects(studio),
    idleFor: (key) => studio.projects.idleFor(key),
    idleMinutes: (await sleepSettings(studio)).idleMinutes,
    keeping: studio.projects.isKeeping(),
  })
  for (const key of idle) {
    await studio.projects.stop(key)
    logger.info(`Stopped ${key}: nothing has used it for a while`)
  }
  return idle
}

export const startIdleReaper = (studio: Studio, logger: Logger, everyMs = 60_000) => {
  let running = false
  const timer = setInterval(async () => {
    if (running) return
    running = true
    try {
      await stopIdleServers(studio, logger)
    } catch (error) {
      logger.warn(`Idle check failed: ${error instanceof Error ? error.message : error}`)
    } finally {
      running = false
    }
  }, everyMs)
  timer.unref()
  return () => clearInterval(timer)
}

const digest = (value: string) => createHash('sha256').update(value).digest()

export const isServiceToken = (authorization: string | undefined | null, expected = process.env.PIKKU_STUDIO_SERVICE_TOKEN) => {
  const match = /^Bearer\s+(.+)$/i.exec(authorization ?? '')
  if (!expected || !match) return false
  return timingSafeEqual(digest(match[1]!.trim()), digest(expected))
}

const statePath = (studio: Studio) => join(studio.home, 'asleep.json')

export const goToSleep = async (studio: Studio, logger: Logger) => {
  await studio.projects.settle()
  for (const key of await busyProjects(studio)) studio.builder.cancel(key)
  for (let i = 0; i < 20 && (await busyProjects(studio)).length > 0; i++) await new Promise((r) => setTimeout(r, 250))
  // A wake re-clones the repo, so what the builder made lives only if it is on the remote first.
  // A save that fails is logged, never a reason to stay awake.
  try {
    for (const w of await studio.projects.saveWork())
      if (!w.pushed) logger.warn(`Builder branch ${w.branch} was not pushed: ${w.error ?? 'unknown'}`)
  } catch (error) {
    logger.warn(`Could not save the builder's work: ${error instanceof Error ? error.message : error}`)
  }
  const open = studio.projects.openKeys()
  await writeFile(statePath(studio), JSON.stringify({ open, at: new Date().toISOString() }, null, 2) + '\n')
  await Promise.all(open.map((key) => studio.projects.stop(key)))
  logger.info(`Studio is asleep with ${open.length} project(s) stopped`)
}

export const wakeUp = async (studio: Studio, logger: Logger) => {
  const path = statePath(studio)
  if (!existsSync(path)) return
  const { open = [] } = JSON.parse(await readFile(path, 'utf8')) as { open?: string[] }
  await rm(path, { force: true })
  for (const key of open) {
    await studio.projects.open(key).catch((error) => logger.warn(`Could not reopen ${key}: ${error instanceof Error ? error.message : error}`))
  }
}
