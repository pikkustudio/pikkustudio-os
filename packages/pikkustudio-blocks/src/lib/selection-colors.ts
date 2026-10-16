export const SELECTION_COLORS = ['#2563eb', '#ea580c', '#16a34a', '#db2777', '#7c3aed', '#ca8a04', '#0d9488', '#dc2626'] as const

export const selectionColor = (slot: number) => SELECTION_COLORS[((slot % SELECTION_COLORS.length) + SELECTION_COLORS.length) % SELECTION_COLORS.length]

export const freeSelectionSlot = (used: number[]) => {
  let slot = 0
  while (used.includes(slot)) slot++
  return slot
}
