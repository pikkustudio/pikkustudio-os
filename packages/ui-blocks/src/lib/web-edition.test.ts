import { expect, test } from 'bun:test'
import { webUnavailableRoute } from './web-edition.ts'

test('the six local-only pages are recognised by their first segment', () => {
  for (const r of ['secrets', 'studio-metrics', 'resume', 'addons', 'add-ons', 'choose-ai']) expect(webUnavailableRoute(`/${r}`)).toBe(r)
  expect(webUnavailableRoute('/add-ons/foo/bar')).toBe('add-ons')
})

test('other pages, and the redirected local-only ones, are not placeholders', () => {
  for (const p of ['/', '/projects', '/sign-in', '/connect', '/secrets-x', '/project-secrets']) expect(webUnavailableRoute(p)).toBeUndefined()
})
