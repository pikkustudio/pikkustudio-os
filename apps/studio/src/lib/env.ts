// Endpoints come from env, never hardcoded.
//
// In local dev VITE_API_URL is set at build time via .dev.vars and Vite
// replaces the import.meta.env reference inline. In CF Workers deployments
// VITE_API_URL is a runtime text binding — invisible to Vite at build time —
// so import.meta.env.VITE_API_URL is undefined in the bundle. We fall back to
// the current origin + /api, which is correct because the dispatcher worker
// routes every /api/* path to the API units on the same hostname.
export function apiUrl(): string {
  if (import.meta.env.SSR) {
    // SSR context: PikkuProvider is a client-side provider and its serverUrl
    // is only consumed by hooks that run in the browser. Return the build-time
    // var when available (local dev) or a placeholder so SSR never throws.
    return import.meta.env.VITE_API_URL ?? '/__api'
  }
  // Client: use the build-time var (local dev) or derive from current origin.
  // Guard: a localhost API base served from a real (remote) origin is a stray
  // dev-server leak — the browser can never reach it, so ignore it and use
  // same-origin /api, which is always correct for a deployed/sandbox bundle.
  const configured = import.meta.env.VITE_API_URL
  const remote = !/^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
  if (configured && !(remote && /\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(configured))) {
    return configured
  }
  return window.location.origin + '/api'
}

/**
 * The path this frontend is mounted under. A non-primary app is served at
 * `/_frontend/<slug>/` on the sandbox's single origin, which the runtime hands to
 * vite as PIKKUSTUDIO_FRONTEND_BASE — so BASE_URL is the only truth about the prefix.
 */
export function basePath(): string {
  const base = import.meta.env.BASE_URL || '/'
  return base.endsWith('/') ? base.slice(0, -1) : base
}

/**
 * Absolute in-app href for anything the router does not resolve itself — a raw
 * `window.location` assignment or a URL handed to Better Auth to redirect back to.
 */
export function appHref(path: string): string {
  return `${basePath()}${path}`
}

/**
 * Whether this build runs beside a Studio backend on the person's own computer: the open and cloud desktop builds do
 * (the default), the web build (VITE_STUDIO_LOCAL=false) does not. A build-time constant, so what the web build leaves
 * out is dropped from its bundle. Only what needs this computer is gated by it: its folders, processes, vault, git
 * remotes, device sign-in and own AI keys.
 */
export const STUDIO_LOCAL = import.meta.env.VITE_STUDIO_LOCAL !== 'false'

/**
 * The backend's own origin, for what it serves outside the API prefix (a project's server under /p/<key>): the API base
 * without a trailing /api. On the desktop that is this page's origin.
 */
export function backendBase(): string {
  return apiUrl().replace(/\/api\/?$/, '')
}
