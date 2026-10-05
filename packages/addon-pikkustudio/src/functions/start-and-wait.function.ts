import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const StartAndWaitInput = z.object({ key: z.string() })
export const StartAndWaitOutput = z.object({ ok: z.boolean(), problem: z.string().optional() })

export const startAndWait = pikkuSessionlessFunc({
  expose: true,
  description: 'Start a project and wait until it is serving, saying what went wrong if it cannot.',
  input: StartAndWaitInput,
  output: StartAndWaitOutput,
  func: async ({ studioProjects, studioHooks }, { key }) => {
    try {
      await studioProjects.open(key)
      await studioProjects.waitForApps(key)
      studioHooks.changed()
      return { ok: true }
    } catch (error) {
      studioProjects.close(key)
      return { ok: false, problem: (error instanceof Error ? error.message : String(error)).slice(-4000) }
    }
  },
})
