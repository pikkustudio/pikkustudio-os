export type Account = {
  id: string
  email: string
  name?: string
  image?: string
  createdAt?: string
  banned?: boolean
  banReason?: string
  banExpires?: string
}

export type AccountsPage = { users: Account[]; total: number }

export const accountName = (a: Pick<Account, 'name' | 'email'>) => a.name?.trim() || a.email

export const joinedOn = (iso: string | undefined) => (iso ? new Date(iso).toLocaleDateString() : null)

export const accountsProblem = (error: unknown): 'not-running' | 'no-addon' | 'forbidden' | 'other' => {
  const e = (error ?? {}) as { status?: number; message?: string }
  const text = e.message ?? ''
  if (e.status === 403 || /permission denied|forbidden/i.test(text)) return 'forbidden'
  if (/local development|local environment|not running|ECONNREFUSED|fetch failed/i.test(text) || [502, 503, 504].includes(e.status ?? 0)) return 'not-running'
  if (e.status === 404 || /not found|unknown rpc|no such/i.test(text)) return 'no-addon'
  return 'other'
}
