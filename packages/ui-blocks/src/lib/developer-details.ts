import { useSyncExternalStore } from 'react'

const KEY = 'developer-details'
const EVENT = 'studio:developer-details'

let current: boolean | null = null

const read = () => {
  if (current !== null) return current
  try {
    current = localStorage.getItem(KEY) === '1'
  } catch {
    current = false
  }
  return current
}

const subscribe = (fn: () => void) => {
  const onStorage = (e: StorageEvent) => {
    if (e.key !== KEY) return
    current = null
    fn()
  }
  window.addEventListener(EVENT, fn)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(EVENT, fn)
    window.removeEventListener('storage', onStorage)
  }
}

const set = (on: boolean) => {
  current = on
  try {
    if (on) localStorage.setItem(KEY, '1')
    else localStorage.removeItem(KEY)
  } catch {}
  window.dispatchEvent(new Event(EVENT))
}

export function useDeveloperDetails(): [boolean, (on: boolean) => void] {
  return [useSyncExternalStore(subscribe, read, () => false), set]
}
