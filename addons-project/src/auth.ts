import { betterAuth } from 'better-auth'
import { pikkuBetterAuth } from '#pikku/auth'

export const auth = pikkuBetterAuth(async ({ kysely, secrets }) => {
  const secret = (await secrets.getSecret('BETTER_AUTH_SECRET')).reveal()
  return betterAuth({
    secret,
    database: { db: kysely, type: 'sqlite' },
    emailAndPassword: { enabled: true },
    advanced: { database: { generateId: 'uuid' } },
  })
})
