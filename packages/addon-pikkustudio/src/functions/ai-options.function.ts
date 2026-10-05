import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { KEY_PROVIDERS, SUBSCRIPTION_PROVIDERS } from '../services/ai.js'

export const AiOptionsInput = z.object({})

export const AiOptionsOutput = z.object({
  keys: z.array(
    z.object({ id: z.string(), name: z.string(), envVar: z.string(), baseUrl: z.string(), model: z.string() })
  ),
  subscriptions: z.array(z.object({ id: z.string(), name: z.string(), piLogin: z.string() })),
})

export const aiOptions = pikkuSessionlessFunc({
  expose: true,
  description: 'The AI providers Studio can build with.',
  input: AiOptionsInput,
  output: AiOptionsOutput,
  func: async () => ({ keys: KEY_PROVIDERS, subscriptions: SUBSCRIPTION_PROVIDERS }),
})
