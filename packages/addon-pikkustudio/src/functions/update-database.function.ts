import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const UpdateDatabaseInput = z.object({ key: z.string() })

export const updateDatabase = pikkuSessionlessFunc({
  description: "Bring a project's database up to date, then start it.",
  input: UpdateDatabaseInput,
  func: async ({ studioProjects, studioHooks }, { key }) => {
    await studioProjects.updateDatabase(key)
    await studioProjects.open(key)
    studioHooks.changed()
    return { serverUrl: `/p/${key}` }
  },
})
