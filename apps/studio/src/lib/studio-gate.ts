import { redirect } from '@tanstack/react-router'
import { signInPath, signInSearch } from '@pikkustudio/blocks/lib/sign-in-redirect'
import { apiUrl } from '@/lib/env'
import { localeFetch } from '@/lib/locale-fetch'

type AuthSearch = { redirect?: string; idea?: string; social?: string }

function afterAuth(search: AuthSearch) {
  if (search.redirect) return search.redirect
  if (search.idea) return `/new-project?idea=${encodeURIComponent(search.idea)}`
  return '/'
}

type Where = { pathname: string; searchStr: string }

async function hasSession() {
  const res = await localeFetch(`${apiUrl()}/studio/account`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  })
  if (!res.ok) return true
  const account = (await res.json().catch(() => null)) as { signIn?: string | null } | null
  return !!account?.signIn
}

export async function requireStudioSession({ location }: { location: Where }) {
  if (typeof window === 'undefined') return
  if (await hasSession().catch(() => true)) return
  throw redirect({ to: signInPath() as never, search: signInSearch(location.pathname + location.searchStr) as never, replace: true })
}

export async function leaveIfSignedIn({ search }: { search: AuthSearch }) {
  if (typeof window === 'undefined' || (!search.redirect && !search.idea)) return
  if (!(await hasSession().catch(() => false))) return
  throw redirect({ href: afterAuth(search), replace: true })
}
