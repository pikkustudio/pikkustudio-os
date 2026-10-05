import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { PublishJobOutput } from '../lib/publish-schemas.js'

export const PublishToFabricInput = z.object({ key: z.string() })

export const publishToFabric = pikkuSessionlessFunc({
  description: 'Publish a project to Fabric.',
  input: PublishToFabricInput,
  output: PublishJobOutput,
  func: async ({ studioPublisher }, { key }) => studioPublisher.fabric(key),
})
