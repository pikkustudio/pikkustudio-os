import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const SetUpDatabaseInput = z.object({ key: z.string() })
export const SetUpDatabaseOutput = z.object({ ok: z.boolean(), problem: z.string().optional() })

export const setUpDatabase = pikkuSessionlessFunc({
  description: "Bring a project's database up to date, saying what went wrong if it cannot.",
  input: SetUpDatabaseInput,
  output: SetUpDatabaseOutput,
  func: async ({ studioProjects }, { key }) => {
    try {
      await studioProjects.updateDatabase(key)
      return { ok: true }
    } catch (error) {
      return { ok: false, problem: (error instanceof Error ? error.message : String(error)).slice(-4000) }
    }
  },
})
