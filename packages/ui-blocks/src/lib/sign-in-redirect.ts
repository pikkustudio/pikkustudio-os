import { STUDIO_LOCAL } from '@/lib/env'

const AUTH_PATHS = /^\/(sign-in|login|signup)(\/|\?|#|$)/

export const safeRedirect = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || value.length > 2000) return undefined
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return undefined
  if (/[\u0000-\u001f\\]/.test(value)) return undefined
  if (AUTH_PATHS.test(value)) return undefined
  return value
}

/** Where signing in happens: this computer's device sign-in, or on the web the website's own page. */
export const signInPath = () => (STUDIO_LOCAL ? '/sign-in' : '/login')

export const isAuthPath = (pathname: string) => AUTH_PATHS.test(pathname)

export const signInSearch = (target: string) => {
  const redirect = safeRedirect(target)
  return redirect ? { redirect } : {}
}

export const isSessionError = (error: unknown) => {
  const e = error as { name?: string; status?: number } | null
  return e?.name === 'MissingSessionError' || e?.status === 401
}
