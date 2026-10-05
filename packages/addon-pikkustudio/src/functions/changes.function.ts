import { z } from 'zod'
import { changesReport } from '@pikku/builder'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const ChangesInput = z.object({ key: z.string() })

export const ChangesOutput = z.object({
  changes: z.array(z.record(z.string(), z.unknown())),
  groups: z.array(z.record(z.string(), z.unknown())),
})

export const changes = pikkuSessionlessFunc({
  expose: true,
  description: "A project's changes, grouped into changesets, and how far each has got.",
  input: ChangesInput,
  output: ChangesOutput,
  func: async ({ studioProjects }, { key }) => changesReport(await studioProjects.projectDir(key)),
})
