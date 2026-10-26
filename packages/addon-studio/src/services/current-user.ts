import { AsyncLocalStorage } from 'node:async_hooks'
import type { Kysely } from 'kysely'

type Who = () => Promise<string | undefined>

const scope = new AsyncLocalStorage<Who>()

/** Runs `work` for the person a request belongs to; `who` is asked lazily, once the request's session is known. */
export const asUser = <T>(who: Who, work: () => T): T => scope.run(who, work)

/** The person the current request is for, or undefined outside a request (background work) or before anyone signed in. */
export const requestUserId = async (): Promise<string | undefined> => scope.getStore()?.()

/** The first person who signed in to this Studio: the owner, who stands in for work that no request started. */
export const ownerUserId = async (db: Kysely<any> | undefined): Promise<string | undefined> => {
  if (!db) return undefined
  const first = await db.selectFrom('user').select('id').orderBy('created_at').executeTakeFirst()
  return first?.id as string | undefined
}

/** The person a call is for: the request's, else the owner. */
export const currentUserId = async (db: Kysely<any> | undefined): Promise<string | undefined> => (await requestUserId()) ?? ownerUserId(db)
