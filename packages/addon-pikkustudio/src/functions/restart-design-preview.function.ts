import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { GetDesignPreviewOutput } from './get-design-preview.function.js'

export const RestartDesignPreviewInput = z.object({ key: z.string() })

export const restartDesignPreview = pikkuSessionlessFunc({
  expose: true,
  description: "Restart a project's design preview.",
  input: RestartDesignPreviewInput,
  output: GetDesignPreviewOutput,
  func: async ({ studioProjects }, { key }) => studioProjects.restartDesign(key),
})
