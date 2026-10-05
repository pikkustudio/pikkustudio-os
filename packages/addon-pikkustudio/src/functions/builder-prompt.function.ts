import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const BuilderPromptInput = z.object({ key: z.string(), message: z.string(), context: z.string().optional() })

export const builderPrompt = pikkuSessionlessFunc({
  description: 'Ask the builder to do something in a project.',
  input: BuilderPromptInput,
  func: async ({ studioBuilder, studioSettings }, { key, message, context }) => {
    const { name, about } = await studioSettings.read()
    const profile = name
      ? `The person you are working with is called ${name}. Address them by that name.${about ? ` About them: ${about}. Tailor your answers to that.` : ''}`
      : undefined
    return studioBuilder.prompt(key, message, [profile, context].filter(Boolean).join('\n\n') || undefined)
  },
})
