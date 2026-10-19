import { apiUrl } from '@/lib/env'

// The router rewrites the repeated ba_param entries into one JSON array; the signature covers the original repeats.
export function signedOAuthQuery(search = typeof window === 'undefined' ? '' : window.location.search) {
  const params = new URLSearchParams(search)
  if (!params.has('sig') || !params.has('ba_param')) return undefined
  const original = new URLSearchParams()
  for (const [key, value] of params) {
    if (key !== 'ba_param') {
      original.append(key, value)
      continue
    }
    try {
      const names = JSON.parse(value)
      for (const name of Array.isArray(names) ? names : [value]) original.append(key, String(name))
    } catch {
      original.append(key, value)
    }
  }
  return original.toString()
}

const json = { 'content-type': 'application/json', accept: 'application/json' }

export async function signInHere(oauthQuery: string) {
  const response = await fetch(`${apiUrl()}/auth/sign-in/local`, {
    method: 'POST',
    credentials: 'include',
    headers: json,
    body: JSON.stringify({ oauth_query: oauthQuery }),
  })
  if (!response.ok) return null
  const reply = (await response.json().catch(() => null)) as { url?: string } | null
  return reply?.url ?? null
}

export async function oauthClientName(clientId: string) {
  const response = await fetch(`${apiUrl()}/auth/oauth2/public-client?client_id=${encodeURIComponent(clientId)}`, { credentials: 'include' })
  if (!response.ok) return null
  const client = (await response.json().catch(() => null)) as { client_name?: string } | null
  return client?.client_name ?? null
}

export async function answerConsent(accept: boolean, scope: string | undefined) {
  const oauth_query = signedOAuthQuery()
  if (!oauth_query) return null
  const response = await fetch(`${apiUrl()}/auth/oauth2/consent`, {
    method: 'POST',
    credentials: 'include',
    headers: json,
    body: JSON.stringify({ accept, ...(scope ? { scope } : {}), oauth_query }),
  })
  if (!response.ok) return null
  const reply = (await response.json().catch(() => null)) as { url?: string } | null
  return reply?.url ?? null
}
