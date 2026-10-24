import { expect, test } from 'bun:test'
import { VariantWordingError, appWrites, wordingWrites, type I18nApp } from './wordingWrite.ts'

const plural = [{ declarations: ['input count', 'local countPlural = count: plural'], selectors: ['countPlural'], match: { 'countPlural=one': '{count} mushroom', 'countPlural=other': '{count} mushrooms' } }]

const fromServer = (): I18nApp[] =>
  JSON.parse(
    JSON.stringify([
      {
        app: 'apps/app',
        baseLocale: 'en',
        locales: { en: { a: 'A', basket__count: plural, email: 'Email', z: 'Z' }, de: { a: 'A-de', basket__count: plural, email: 'E-Mail' } },
        catalogs: [{ catalog: 'apps/app/messages', locales: { en: { a: 'A', basket__count: plural, email: 'Email', z: 'Z' }, de: { a: 'A-de', basket__count: plural, email: 'E-Mail' } } }],
      },
    ]),
  )

test('a catalogue holding a plural round-trips byte for byte apart from the edited key', () => {
  const apps = fromServer()
  const before = JSON.stringify(apps[0]!.catalogs![0]!.locales.en)
  const [write] = wordingWrites(apps, 'email', { en: 'E-mail address' })
  expect(write!.catalog).toBe('apps/app/messages')
  expect(JSON.stringify(write!.content)).toBe(before.replace('"email":"Email"', '"email":"E-mail address"'))
  expect(JSON.stringify(write!.content.basket__count)).toBe(JSON.stringify(plural))
})

test('a key missing in a locale is added without touching the rest', () => {
  const [write] = wordingWrites(fromServer(), 'z', { de: 'Z-de' })
  expect(JSON.stringify(write!.content)).toBe(JSON.stringify({ a: 'A-de', basket__count: plural, email: 'E-Mail', z: 'Z-de' }))
})

test('a plural message is never overwritten', () => {
  expect(() => wordingWrites(fromServer(), 'basket__count', { en: '3 mushrooms' })).toThrow(VariantWordingError)
})

const twoFolders = (): I18nApp =>
  JSON.parse(
    JSON.stringify({
      app: 'apps/app',
      baseLocale: 'en',
      locales: { en: { a: 'A', b: 'B', basket__count: plural }, de: { a: 'A-de', b: 'B-de', basket__count: plural } },
      catalogs: [
        { catalog: 'apps/app/messages', locales: { en: { a: 'A', basket__count: plural }, de: { a: 'A-de', basket__count: plural } } },
        { catalog: 'packages/ui/messages', locales: { en: { b: 'B' }, de: { b: 'B-de' } } },
      ],
    }),
  )

test('edits across two folders write each folder only with its own keys', () => {
  const writes = appWrites(twoFolders(), [
    { key: 'a', locale: 'de', value: 'A2' },
    { key: 'b', locale: 'de', value: 'B2' },
  ])
  expect(writes.map((w) => [w.catalog, JSON.stringify(w.content)])).toEqual([
    ['apps/app/messages', JSON.stringify({ a: 'A2', basket__count: plural })],
    ['packages/ui/messages', JSON.stringify({ b: 'B2' })],
  ])
})

test('a batch that touches a plural writes nothing', () => {
  expect(() => appWrites(twoFolders(), [{ key: 'a', locale: 'de', value: 'x' }, { key: 'basket__count', locale: 'de', value: 'y' }])).toThrow(VariantWordingError)
})

test('a key held by no single folder is refused instead of merged into one', () => {
  const app = twoFolders()
  app.locales.en!.ghost = 'G'
  expect(() => appWrites(app, [{ key: 'ghost', locale: 'de', value: 'x' }])).toThrow(/No single message catalog/)
})
