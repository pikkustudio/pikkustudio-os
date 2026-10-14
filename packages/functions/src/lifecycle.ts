import { pikkuServerLifecycle } from '#pikku/setup'
import { goToSleep, startIdleReaper } from './lib/sleep.js'
import { startHeadless, stopHeadless } from './lib/headless.js'
import { serviceModeOn } from './lib/service-mode.js'
import { installedVersion, startUpdater } from './lib/updater.js'
import { studioHome } from '@pikkustudio/addon-studio/services'

let stopUpdater: (() => void) | undefined
let stopReaper: (() => void) | undefined

export const lifecycle = pikkuServerLifecycle({
  afterStart: async ({ studio, logger }) => {
    void startHeadless(studio, logger)
    if (!serviceModeOn()) stopReaper = startIdleReaper(studio, logger)
    const current = await installedVersion()
    if (current && !serviceModeOn() && process.env.PIKKU_STUDIO_UPDATE !== '0')
      stopUpdater = startUpdater(studioHome(), current, logger)
  },
  beforeStop: async ({ studio, logger }) => {
    stopHeadless()
    stopReaper?.()
    stopUpdater?.()
    await goToSleep(studio, logger)
  },
})
