export type Catalog = Record<string, unknown>
export type I18nApp = { app: string; baseLocale: string; locales: Record<string, Catalog>; catalogs?: { catalog: string; locales: Record<string, Catalog> }[] }
export type WordingWrite = { app: string; locale: string; content: Catalog; catalog?: string }
export type WordingEdit = { key: string; locale: string; value: string }

export class VariantWordingError extends Error {
  constructor(key: string) {
    super(`${key} has a different form per number or case, so it cannot be saved as one text`)
  }
}

export const isVariant = (app: I18nApp, key: string) =>
  [app.locales, ...(app.catalogs ?? []).map((c) => c.locales)].some((locales) =>
    Object.values(locales).some((catalog) => catalog[key] !== undefined && typeof catalog[key] !== 'string'),
  )

export function appWrites(app: I18nApp, edits: WordingEdit[]): WordingWrite[] {
  const writes = new Map<string, WordingWrite>()
  for (const { key, locale, value } of edits) {
    if (isVariant(app, key)) throw new VariantWordingError(key)
    const catalog = app.catalogs?.find((c) => key in (c.locales[app.baseLocale] ?? {}))
    if (!catalog && (app.catalogs?.length ?? 0) > 1) throw new Error(`No single message catalog holds ${key}`)
    const id = `${catalog?.catalog ?? ''}\n${locale}`
    let write = writes.get(id)
    if (!write) {
      write = { app: app.app, locale, content: { ...(catalog ? catalog.locales[locale] : app.locales[locale]) }, catalog: catalog?.catalog }
      writes.set(id, write)
    }
    write.content[key] = value
  }
  return [...writes.values()]
}

export function wordingWrites(apps: I18nApp[], key: string, changes: Record<string, string>): WordingWrite[] {
  const app = apps.find((a) => key in (a.locales[a.baseLocale] ?? {}))
  if (!app) throw new Error(`No message catalog in this app holds ${key}`)
  return appWrites(app, Object.entries(changes).map(([locale, value]) => ({ key, locale, value })))
}
