import { useSyncExternalStore } from 'react'
import type { I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'

export type Toast = { id: number; text: I18nString }

let items: Toast[] = []
let next = 1
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export function toast(text: I18nString) {
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

export function errorText(error: unknown): I18nString {
  const name = (error as { name?: string } | null)?.name
  if (name === 'MissingSessionError') return m.toast__sign_in_again()
  if (name === 'ForbiddenError') return m.toast__not_allowed()
  return m.toast__failed()
}
