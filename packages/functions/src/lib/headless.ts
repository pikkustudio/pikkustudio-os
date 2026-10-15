import type { Logger } from '@pikku/core/services'
import type { Studio } from './studio.js'
import { recordAccess, wakeUp } from './sleep.js'

export const headlessKey = () => process.env.PIKKU_STUDIO_PROJECT_KEY ?? 'app'

export const tickChanges = (studio: Pick<Studio, 'projects' | 'builder'>, key: string, everyMs: number, logger?: Logger) => {
  let ticking = false
  const timer = setInterval(async () => {
    if (ticking || !studio.projects.runningProject(key)) return
    ticking = true
    try {
      const { started, reason } = await studio.builder.startChanges(key, true)
      if (started) {
        recordAccess()
        logger?.info(`Studio tick: ${reason}`)
      }
    } catch (error) {
      logger?.warn(`Studio tick failed: ${error instanceof Error ? error.message : error}`)
    } finally {
      ticking = false
    }
  }, everyMs)
  return () => clearInterval(timer)
}

let stopTick: (() => void) | undefined

export const stopHeadless = () => {
  stopTick?.()
  stopTick = undefined
}

export const startHeadless = async (studio: Studio, logger: Logger, project = process.env.PIKKU_STUDIO_PROJECT) => {
  await wakeUp(studio, logger)
  if (!project) return
  try {
    const key = headlessKey()
    await studio.projects.add(project, key)
    await studio.projects.open(key)
    logger.info(`Studio opened ${project} as ${key}`)
    const seconds = Number(process.env.PIKKU_STUDIO_TICK_SECONDS ?? 30)
    if (seconds > 0) {
      stopHeadless()
      stopTick = tickChanges(studio, key, seconds * 1000, logger)
    }
  } catch (error) {
    logger.error(`Could not open ${project}: ${error instanceof Error ? error.message : error}`)
  }
}
