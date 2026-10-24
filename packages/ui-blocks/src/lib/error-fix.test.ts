import { expect, test } from 'bun:test'
import { errorFixOf } from './error-fix.ts'

test('a refusal ending in a path gives its reason and that screen, as the builder wraps it too', () => {
  expect(errorFixOf('Pikku could not take the request: Add credit to Acme Ltd first: /acme/billing')).toEqual({ text: 'Add credit to Acme Ltd first', fix: '/acme/billing' })
  expect(errorFixOf('Connect your account: /profile')).toEqual({ text: 'Connect your account', fix: '/profile' })
})

test('a refusal without a screen to go to has no fix', () => {
  expect(errorFixOf('Pikku could not take the request: An error occurred')).toBeNull()
  expect(errorFixOf('Failed at 10:30')).toBeNull()
  expect(errorFixOf(undefined)).toBeNull()
})
