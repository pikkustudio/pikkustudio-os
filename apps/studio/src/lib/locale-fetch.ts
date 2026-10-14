import { getLocale } from '@/paraglide/runtime.js'

/** Tells Studio's API which language the person reads, so its agents answer in it. */
export const LOCALE_HEADER = 'x-studio-locale'

export const localeFetch = ((input: RequestInfo | URL, init?: RequestInit) => {
  const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
  headers.set(LOCALE_HEADER, getLocale())
  return globalThis.fetch(input, { ...init, headers })
}) as typeof globalThis.fetch
