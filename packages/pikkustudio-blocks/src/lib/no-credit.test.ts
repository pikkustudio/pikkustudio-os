import { expect, test } from 'bun:test'
import { noCreditOf } from './no-credit.ts'

// The sentence is CloudCreditNeededError's (addon-cloud src/lib/no-credit.ts); keep the two in step.
test("the cloud's no-credit reason gives the team and its billing page, as the builder wraps it too", () => {
  expect(noCreditOf('Pikku could not take the request: Add credit to Acme Ltd to build with Pikku Studio Cloud AI: /acme/billing')).toEqual({ org: 'Acme Ltd', fix: '/acme/billing' })
  expect(noCreditOf('Add credit to Acme to build with Pikku Studio Cloud AI')).toEqual({ org: 'Acme', fix: null })
})

test('any other failure is not a credit problem', () => {
  expect(noCreditOf('Pikku could not take the request: An error occurred')).toBeNull()
  expect(noCreditOf(undefined)).toBeNull()
})
