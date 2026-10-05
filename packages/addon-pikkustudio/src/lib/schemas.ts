import { z } from 'zod'

export const SignInChoice = z.enum(['local', 'fabric']).nullable()

export const AiChoice = z
  .union([
    z.object({ kind: z.literal('key'), provider: z.string(), model: z.string(), baseUrl: z.string().optional() }),
    z.object({ kind: z.literal('subscription'), provider: z.string() }),
    z.object({ kind: z.literal('fabric') }),
  ])
  .nullable()

export const Settings = z.object({ signIn: SignInChoice, name: z.string().nullable(), about: z.string().nullable() })

export const KeyInput = z.object({ key: z.string() })
