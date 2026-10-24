import type { Kysely } from 'kysely'
import { type ProjectStore, type RegistryEntry } from './projects.js'

type Row = { project_id?: string; projectId?: string; owner?: string; name: string; slug: string; path: string; created_at?: string; createdAt?: string }

export const kyselyProjectStore = (db: Kysely<any>, legacy?: ProjectStore): ProjectStore => {
  let imported: Promise<void> | undefined
  const importOnce = () =>
    (imported ??= (async () => {
      const count = await db.selectFrom('project').select(db.fn.countAll<number>().as('n')).executeTakeFirst()
      if (Number(count?.n ?? 0) > 0) return
      const old = (await legacy?.load()) ?? []
      if (old.length) await write(old)
    })())
  const write = async (entries: RegistryEntry[]) => {
    await db.transaction().execute(async (trx) => {
      await trx.deleteFrom('project').execute()
      if (!entries.length) return
      await trx
        .insertInto('project')
        .values(
          entries.map((e) => ({
            project_id: e.id,
            name: e.name ?? '',
            owner: e.owner ?? '',
            slug: e.slug ?? '',
            path: e.path,
            created_at: e.addedAt,
          })),
        )
        .execute()
    })
  }
  return {
    async load() {
      await importOnce()
      const rows = (await db.selectFrom('project').selectAll().orderBy('created_at').execute()) as Row[]
      return rows.map((r) => ({ id: (r.projectId ?? r.project_id) as string, path: r.path, addedAt: (r.createdAt ?? r.created_at) as string, slug: r.slug || undefined, owner: r.owner || undefined, name: r.name }))
    },
    async save(entries) {
      await importOnce()
      await write(entries)
    },
  }
}
