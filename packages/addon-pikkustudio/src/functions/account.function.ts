import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { AiChoice, SignInChoice } from '../lib/schemas.js'
import { startSession } from '../lib/session.js'

export const AccountInput = z.object({})

export const AccountOutput = z.object({
  signIn: SignInChoice,
  ai: AiChoice,
  name: z.string().nullable(),
  about: z.string().nullable(),
  signedIn: z.boolean(),
  apiUrl: z.string(),
  consoleUrl: z.string(),
})

export const account = pikkuSessionlessFunc({
  description: 'The sign-in choice, the AI choice and the Fabric account.',
  input: AccountInput,
  output: AccountOutput,
  func: async ({ studioSettings, studioProjects, studioAi, auth }, _input, { session, http }) => {
    const [current, account] = await Promise.all([studioSettings.read(), studioProjects.getAccount()])
    const chosen = current.signIn === 'fabric' && !account.signedIn ? null : current.signIn
    const signIn = chosen && !session ? await startSession(auth, http).then(() => chosen, () => null) : chosen
    return { signIn, name: current.name, about: current.about, ai: await studioAi.choice(), ...account }
  },
})
