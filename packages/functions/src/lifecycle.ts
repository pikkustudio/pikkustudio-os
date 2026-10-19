import { pikkuServerLifecycle } from '#pikku/setup'
import { goToSleep, sleepSettings, startIdleReaper } from './lib/sleep.js'
import { startHeadless, stopHeadless } from './lib/headless.js'
import { serviceModeOn } from './lib/service-mode.js'
import { installedVersion, startUpdater } from './lib/updater.js'
import { studioHome } from '@pikkustudio/addon-studio/services'

let stopUpdater: (() => void) | undefined
let stopReaper: (() => void) | undefined
let stopPresence: Array<() => void> = []

export const lifecycle = pikkuServerLifecycle({
  afterStart: async ({ studio, logger, studioPresence }) => {
    void startHeadless(studio, logger)
    const host = {
      projects: studio.projects,
      idleMinutes: async () => (await sleepSettings(studio)).idleMinutes,
      location: serviceModeOn() ? ('cloud' as const) : ('desktop' as const),
    }
    stopPresence = Object.values(studioPresence ?? {}).map((start) => start(host, logger))
    if (!serviceModeOn()) stopReaper = startIdleReaper(studio, logger)
    const current = await installedVersion()
    if (current && !serviceModeOn() && process.env.PIKKU_STUDIO_UPDATE !== '0')
      stopUpdater = startUpdater(studioHome(), current, logger)
  },
  beforeStop: async ({ studio, logger }) => {
    stopHeadless()
    stopReaper?.()
    stopUpdater?.()
    for (const stop of stopPresence) stop()
    await goToSleep(studio, logger)
  },
})
