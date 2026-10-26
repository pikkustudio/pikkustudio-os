import type { Kysely } from 'kysely'
import { kyselySetting } from './setting-store.js'
import { ownerUserId } from './current-user.js'

/** Who a person using Studio is: what to call them (the Better Auth `user.name`) and what they do (a per-user `setting`). */
export interface Profile {
  name: string | null
  about: string | null
}

/** What the local sign-in names the owner before they have said who they are. */
export const UNNAMED_OWNER = 'Studio owner'

const EMPTY: Profile = { name: null, about: null }

export interface ProfileStore {
  read(userId: string): Promise<Profile>
  write(userId: string, patch: Partial<Profile>): Promise<Profile>
  /** The first person who signed in: the one Studio's projects are filed under before anyone is asking. */
  owner(): Promise<Profile>
}

const named = (name: string | null | undefined) => (name && name.trim() && name !== UNNAMED_OWNER ? name : null)

export const memoryProfile = (): ProfileStore => {
  const held = new Map<string, Profile>()
  const read = async (userId: string) => held.get(userId) ?? EMPTY
  return {
    read,
    write: async (userId, patch) => {
      const next = { ...(await read(userId)), ...patch }
      held.set(userId, next)
      return next
    },
    owner: async () => [...held.values()][0] ?? EMPTY,
  }
}

const aboutKey = (userId: string) => `about:${userId}`

export const kyselyProfile = (db: Kysely<any>): ProfileStore => {
  const read = async (userId: string): Promise<Profile> => {
    const user = await db.selectFrom('user').select('name').where('id', '=', userId).executeTakeFirst()
    const about = await kyselySetting<string>(db, aboutKey(userId)).get()
    return { name: named(user?.name as string | undefined), about }
  }
  return {
    read,
    async write(userId, patch) {
      if (patch.name !== undefined && patch.name !== null) {
        await db.updateTable('user').set({ name: patch.name, updated_at: new Date().toISOString() }).where('id', '=', userId).execute()
      }
      if (patch.about !== undefined) await kyselySetting<string>(db, aboutKey(userId)).set(patch.about)
      return read(userId)
    },
    async owner() {
      const id = await ownerUserId(db)
      return id ? read(id) : EMPTY
    },
  }
}
