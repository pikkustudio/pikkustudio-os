import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { PublishJobOutput } from '../lib/publish-schemas.js'

export const PublishStatusInput = z.object({ key: z.string() })

export const publishStatus = pikkuSessionlessFunc({
  description: "How a project's publish is going.",
  input: PublishStatusInput,
  output: PublishJobOutput,
  func: async ({ studioPublisher }, { key }) => studioPublisher.status(key),
})
