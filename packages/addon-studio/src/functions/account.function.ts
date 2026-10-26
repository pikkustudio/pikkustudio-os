import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { AiChoice, SignInChoice } from '../lib/schemas.js'
import { startSession } from '../lib/session.js'
import { viewerOf } from '../services/shell-source.js'

export const AccountInput = z.object({
  /** The team the URL names, for the current team and the viewer's scopes in it. */
  team: z.string().optional(),
})

const Team = z.object({ slug: z.string(), name: z.string(), personal: z.boolean(), memberCount: z.number(), projectCount: z.number() })

export const AccountOutput = z.object({
  signIn: SignInChoice,
  ai: AiChoice,
  name: z.string().nullable(),
  about: z.string().nullable(),
  signedIn: z.boolean(),
  apiUrl: z.string(),
  consoleUrl: z.string(),
  user: z.object({ name: z.string().nullable(), email: z.string().nullable() }).nullable(),
  teams: z.array(Team),
  currentTeam: z.string().nullable(),
  links: z.array(z.object({ id: z.string(), path: z.string() })),
  scopes: z.array(z.string()),
})

export const account = pikkuSessionlessFunc({
  expose: true,
  description: 'The sign-in choice, the AI choice and the signed-in account: its user, teams, current team, links and scopes. Without an account source: no user, no teams, every scope.',
  input: AccountInput,
  output: AccountOutput,
  func: async ({ studioSettings, studioProfile, studioProjects, studioAi, auth, accountSource }, { team }, { session, http }) => {
    const [current, profile, account, viewer] = await Promise.all([studioSettings.read(), session?.userId ? studioProfile.read(session.userId) : { name: null, about: null }, studioProjects.getAccount(), viewerOf(accountSource, { team, session })])
    const chosen = current.signIn && current.signIn !== 'local' && !account.signedIn ? null : current.signIn
    const signIn = chosen && !session ? await startSession(auth, http).then(() => chosen, () => null) : chosen
    return { signIn, name: profile.name, about: profile.about, ai: await studioAi.choice(), ...account, ...viewer }
  },
})
