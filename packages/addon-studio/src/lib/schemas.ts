import { z } from 'zod'

/** `local`, or the namespace of the contributed source Studio signed in to. */
export const SignInChoice = z.string().nullable()

export const AiChoice = z
  .union([
    z.object({ kind: z.literal('key'), provider: z.string(), model: z.string(), baseUrl: z.string().optional() }),
    z.object({ kind: z.literal('subscription'), provider: z.string() }),
    z.object({ kind: z.literal('source'), source: z.string() }),
  ])
  .nullable()

export const Settings = z.object({ signIn: SignInChoice })
export const Profile = z.object({ name: z.string().nullable(), about: z.string().nullable() })

export const KeyInput = z.object({ key: z.string() })
