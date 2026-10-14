import { test } from 'node:test'
import assert from 'node:assert/strict'

const store = new Map<string, string>()
const root = { lang: '', dir: '' }
Object.assign(globalThis, {
  window: globalThis,
  document: { documentElement: root },
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  },
})
store.set('app-locale', 'ar')

const config = await import('./config')

test('a language saved under the old key is kept and moved to the shared key', () => {
  assert.equal(config.LOCALE_KEY, 'studio-locale')
  assert.equal(store.get('studio-locale'), 'ar')
  assert.equal(store.has('app-locale'), false)
  assert.equal(root.lang, 'ar')
  assert.equal(root.dir, 'rtl')
})

test('switching through the switcher flips dir and persists under the shared key', () => {
  config.setActiveLocale('en')
  assert.equal(root.dir, 'ltr')
  assert.equal(store.get('studio-locale'), 'en')
  config.setActiveLocale('ar')
  assert.equal(root.lang, 'ar')
  assert.equal(root.dir, 'rtl')
  assert.equal(store.get('studio-locale'), 'ar')
  assert.equal(store.has('app-locale'), false)
})
