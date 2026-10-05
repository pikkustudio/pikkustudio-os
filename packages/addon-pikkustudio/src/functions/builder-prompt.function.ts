import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const BuilderPromptInput = z.object({ key: z.string(), message: z.string(), context: z.string().optional(), failOnError: z.boolean().optional() })

export const builderPrompt = pikkuSessionlessFunc({
  expose: true,
  description: 'Ask the builder to do something in a project.',
  input: BuilderPromptInput,
  func: async ({ studioBuilder, studioSettings }, { key, message, context, failOnError }) => {
    const { name, about } = await studioSettings.read()
    const profile = name
      ? `The person you are working with is called ${name}. Address them by that name.${about ? ` About them: ${about}. Tailor your answers to that.` : ''}`
      : undefined
    const state = await studioBuilder.prompt(key, message, [profile, context].filter(Boolean).join('\n\n') || undefined)
    const last = state.items[state.items.length - 1]
    if (failOnError && last?.kind === 'error') throw new Error(last.text.replace(/^Pikku could not take the request: /, ''))
    return state
  },
})
