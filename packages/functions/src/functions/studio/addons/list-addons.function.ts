import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'
import { ADDONS_KEY, ensureAddonsProject, readInstalledAddons } from '../../../lib/addons-project.js'

export const ListAddonsInput = z.object({})

export const ListAddonsOutput = z.object({
  addons: z.array(
    z.object({
      name: z.string(),
      title: z.string(),
      screens: z.array(z.object({ path: z.string(), title: z.string(), nav: z.boolean() })),
    })
  ),
})

export const listAddons = pikkuFunc({
  expose: true,
  readonly: true,
  auth: true,
  description: 'The add-ons installed in the Add-ons project and the screens each one offers.',
  input: ListAddonsInput,
  output: ListAddonsOutput,
  func: async ({ studio }) => {
    await ensureAddonsProject(studio)
    const running = await studio.projects.open(ADDONS_KEY)
    return { addons: await readInstalledAddons(running.worktree) }
  },
})
