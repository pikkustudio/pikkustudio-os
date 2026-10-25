import { describe, expect, test } from 'bun:test'
import { reviewProjectId } from './review'

describe('reviewProjectId', () => {
  test('reduces a cloud key to its bare uuid', () => {
    expect(reviewProjectId('cloud:0b9f6c1e-1111-4222-8333-444455556666@puckered-georgette')).toBe('0b9f6c1e-1111-4222-8333-444455556666')
  })
  test('keeps a cloud key without a slug', () => {
    expect(reviewProjectId('cloud:0b9f6c1e-1111-4222-8333-444455556666')).toBe('0b9f6c1e-1111-4222-8333-444455556666')
  })
  test('leaves non-cloud keys unchanged', () => {
    expect(reviewProjectId('local:abc')).toBe('local:abc')
    expect(reviewProjectId('plain')).toBe('plain')
  })
})
