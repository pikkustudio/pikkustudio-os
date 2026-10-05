import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { PublishOptionsOutput } from '../lib/publish-schemas.js'

export const PublishOptionsInput = z.object({ key: z.string() })

export const publishOptions = pikkuSessionlessFunc({
  description: 'Where a project can be published, and the prompts for each.',
  input: PublishOptionsInput,
  output: PublishOptionsOutput,
  func: async ({ studioPublisher }, { key }) => studioPublisher.options(key),
})
