import type { Kysely } from 'kysely'

/** One small piece of Studio's own state, kept as a JSON value under a key. `set(null)` forgets it. */
export interface SettingStore<T> {
  get(): Promise<T | null>
  set(value: T | null): Promise<void>
}

export const memorySetting = <T>(): SettingStore<T> => {
  let held: T | null = null
  return { get: async () => held, set: async (value) => void (held = value) }
}

/** A row of `studio_setting` (key, JSON value). */
export const kyselySetting = <T>(db: Kysely<any>, key: string): SettingStore<T> => ({
  async get() {
    const row = await db.selectFrom('studio_setting').select('value').where('key', '=', key).executeTakeFirst()
    return row ? (JSON.parse(row.value as string) as T) : null
  },
  async set(value) {
    if (value === null) {
      await db.deleteFrom('studio_setting').where('key', '=', key).execute()
      return
    }
    const json = JSON.stringify(value)
    await db.insertInto('studio_setting').values({ key, value: json }).onConflict((oc) => oc.column('key').doUpdateSet({ value: json })).execute()
  },
})
