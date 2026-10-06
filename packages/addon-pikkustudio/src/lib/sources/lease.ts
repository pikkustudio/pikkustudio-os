import type { Layer } from './layers.js'

export const LEASE_MS = 24 * 60 * 60 * 1000

export interface LeaseOptions {
  ttlMs?: number
  now?: () => number
}

interface Held<T> {
  values: Map<string, T | undefined>
  takenAt: number
}

export const leased = <T>(
  name: string,
  fetchAll: () => Promise<Record<string, T>>,
  options: LeaseOptions = {},
): Layer<T> & { forget(): void; expiresAt(): number | undefined } => {
  const ttl = options.ttlMs ?? LEASE_MS
  const now = options.now ?? Date.now
  let held: Held<T> | undefined
  let pending: Promise<Held<T> | undefined> | undefined

  const fresh = () => held && now() - held.takenAt < ttl

  const renew = () => {
    pending ??= fetchAll()
      .then((all) => (held = { values: new Map(Object.entries(all)), takenAt: now() }))
      .catch(() => {
        held = undefined
        return undefined
      })
      .finally(() => {
        pending = undefined
      })
    return pending
  }

  return {
    name,
    async get(key) {
      const current = fresh() ? held : await renew()
      return current?.values.get(key)
    },
    forget() {
      held = undefined
    },
    expiresAt: () => (held ? held.takenAt + ttl : undefined),
  }
}
