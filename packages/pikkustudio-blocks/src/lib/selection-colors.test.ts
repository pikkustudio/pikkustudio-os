import { expect, test } from 'bun:test'
import { SELECTION_COLORS, freeSelectionSlot, selectionColor } from './selection-colors.ts'

test('colours are distinct and cycle', () => {
  expect(new Set(SELECTION_COLORS).size).toBe(SELECTION_COLORS.length)
  expect(selectionColor(SELECTION_COLORS.length)).toBe(selectionColor(0))
})

test('a freed slot is reused and others keep theirs', () => {
  expect(freeSelectionSlot([])).toBe(0)
  expect(freeSelectionSlot([0, 1, 2])).toBe(3)
  expect(freeSelectionSlot([0, 2])).toBe(1)
})
