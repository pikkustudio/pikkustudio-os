import { expect, test } from 'bun:test'
import { checklistEnabled } from './checklist-key.ts'

test('a project on this computer and a cloud project have a checklist', () => {
  expect(checklistEnabled('my-app')).toBe(true)
  expect(checklistEnabled('cloud:abc')).toBe(true)
  expect(checklistEnabled('cloud:abc@prod')).toBe(true)
})

test('an empty key and another source have none', () => {
  expect(checklistEnabled('')).toBe(false)
  expect(checklistEnabled('github:abc')).toBe(false)
})
