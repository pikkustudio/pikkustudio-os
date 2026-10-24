import { useEffect, useSyncExternalStore } from 'react'
import type { I18nString } from '@pikku/react'

let current: I18nString | null = null
const listeners = new Set<() => void>()
const set = (next: I18nString | null) => {
  current = next
  for (const l of listeners) l()
}

export const usePublishPageTitle = (title: I18nString) =>
  useEffect(() => {
    set(title)
    return () => {
      if (current === title) set(null)
    }
  }, [title])

export const usePageTitle = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => current,
    () => null,
  )
