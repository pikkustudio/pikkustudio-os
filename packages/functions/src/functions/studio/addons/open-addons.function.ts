import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'
import { ADDONS_APP, ADDONS_KEY, ensureAddonsProject } from '../../../lib/addons-project.js'

export const OpenAddonsInput = z.object({})

export const OpenAddonsOutput = z.object({ appUrl: z.string() })

export const openAddons = pikkuFunc({
  expose: true,
  auth: true,
  description: 'Start the Add-ons project and return where its screens are served.',
  input: OpenAddonsInput,
  output: OpenAddonsOutput,
  func: async ({ studio }) => {
    await ensureAddonsProject(studio)
    await studio.frameSecret()
    await studio.projects.open(ADDONS_KEY)
    const apps = await studio.projects.waitForApps(ADDONS_KEY)
    const app = apps.find((candidate) => candidate.slug === ADDONS_APP)
    if (!app?.url) throw new Error('The Add-ons project has no screens app')
    return { appUrl: app.url }
  },
})
