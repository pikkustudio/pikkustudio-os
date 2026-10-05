import { useSyncExternalStore } from 'react'

export type Toast = { id: number; text: string }

let items: Toast[] = []
let next = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function toast(text: string) {
  if (items.some((t) => t.text === text)) return
  const id = next++
  items = [...items, { id, text }]
  emit()
  setTimeout(() => dismiss(id), 6000)
}

export function dismiss(id: number) {
  items = items.filter((t) => t.id !== id)
  emit()
}

export function useToasts() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => items,
    () => items,
  )
}

export function errorText(error: unknown) {
  const name = (error as { name?: string } | null)?.name
  if (name === 'MissingSessionError') return 'Sign in again to carry on.'
  if (name === 'ForbiddenError') return 'You are not allowed to do that.'
  return 'That did not work. Please try again.'
}
