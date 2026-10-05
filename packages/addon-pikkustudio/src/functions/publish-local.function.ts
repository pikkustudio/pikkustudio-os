import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const PublishLocalInput = z.object({ key: z.string() })

export const publishLocal = pikkuSessionlessFunc({
  description: 'Publish a project on this computer: keep the everyday copy into main, then run main as the live version.',
  input: PublishLocalInput,
  output: z.object({ url: z.string(), port: z.number(), kept: z.number() }),
  func: async ({ studioProjects }, { key }) => studioProjects.publishLocal(key),
})
