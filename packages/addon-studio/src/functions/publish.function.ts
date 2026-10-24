import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { PublishJobOutput } from '../lib/publish-schemas.js'

export const PublishInput = z.object({ key: z.string(), target: z.string() })

export const publish = pikkuSessionlessFunc({
  expose: true,
  description: "Publish a project to one of the places publishOptions lists: save its work, push it, and run the target's own deploy step if it has one.",
  input: PublishInput,
  output: PublishJobOutput,
  func: async ({ studioPublisher }, { key, target }) => studioPublisher.deploy(key, target),
})
