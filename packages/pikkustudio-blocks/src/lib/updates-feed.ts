export type FeedActor = { kind: 'you' } | { kind: 'pikku' } | { kind: 'app' } | { kind: 'person'; name: string }

export type Phrase =
  | 'secret_read'
  | 'secret_write'
  | 'secret_delete'
  | 'token_mint'
  | 'create_user'
  | 'remove_user'
  | 'ban_user'
  | 'set_password'
  | 'sign_in_link'
  | 'sign_out'
  | 'switch'
  | 'switch_reset'
  | 'group_create'
  | 'group_delete'
  | 'group_change'
  | 'group_add'
  | 'group_remove'
  | 'connection_set'
  | 'connection_delete'
  | 'ai_own'
  | 'ai_hosted'
  | 'account_sign_in'
  | 'account_sign_out'
  | 'publish'
  | 'change_asked'
  | 'change_working'
  | 'change_needs_answer'
  | 'change_done'
  | 'unknown'

export type FeedItem = {
  id: string
  at: string
  phrase: Phrase
  actor: FeedActor
  subject: string | null
  outcome: 'ok' | 'warn' | 'bad'
}

export type RawAudit = {
  eventId?: string
  type: string
  outcome?: 'success' | 'failed' | 'denied'
  occurredAt: string
  userIdentity?: { userId?: string; pikkuUserId?: string }
  metadata?: Record<string, unknown>
}

export type RawPerson = { name?: string; email?: string }
export type RawVault = { at: string; who: string; action: string; key: string | null; outcome: string }
export type RawChange = { changeId: string; title: string; status: string; createdAt: string; updatedAt?: string }

const PHRASES: Record<string, Phrase> = {
  'secret.read': 'secret_read',
  'secret.write': 'secret_write',
  'secret.delete': 'secret_delete',
  'token.mint': 'token_mint',
  createUser: 'create_user',
  removeUser: 'remove_user',
  setUserBanned: 'ban_user',
  setUserPassword: 'set_password',
  sendSignInLink: 'sign_in_link',
  revokeUserSessions: 'sign_out',
  flagSetEnabled: 'switch',
  flagSetOverride: 'switch',
  flagSetRollout: 'switch',
  flagClearOverride: 'switch_reset',
  scopeCreateRole: 'group_create',
  scopeDeleteRole: 'group_delete',
  scopeSetRoleScopes: 'group_change',
  scopeAddScopeToUser: 'group_change',
  scopeRemoveScopeFromUser: 'group_change',
  scopeAddUserToRole: 'group_add',
  scopeRemoveUserFromRole: 'group_remove',
  credentialSet: 'connection_set',
  credentialDelete: 'connection_delete',
}

export const phraseFor = (type: string): Phrase => {
  const last = type.slice(type.lastIndexOf(':') + 1)
  return PHRASES[type] ?? PHRASES[last] ?? 'unknown'
}

const looksInternal = (v: string) => v.length === 0 || v.length > 40 || /^[0-9a-f-]{16,}$/i.test(v) || /[{}[\]\\]/.test(v) || /^[a-z]+:[A-Za-z]/.test(v)

export const subjectOf = (metadata: Record<string, unknown> | undefined): string | null => {
  for (const field of ['resource', 'key', 'name', 'title', 'path']) {
    const v = metadata?.[field]
    if (typeof v === 'string' && !looksInternal(v.trim())) return v.trim()
  }
  return null
}

const toneOf = (outcome: string | undefined): FeedItem['outcome'] => (outcome === 'failed' ? 'bad' : outcome === 'denied' ? 'warn' : 'ok')

export const projectEvent = (entry: RawAudit, users: Record<string, RawPerson> | undefined): FeedItem => {
  const id = entry.userIdentity?.userId
  const person = id ? users?.[id] : undefined
  const name = person?.name || person?.email
  const actor: FeedActor = name ? { kind: 'person', name } : { kind: 'pikku' }
  return {
    id: entry.eventId ?? `audit:${entry.occurredAt}:${entry.type}`,
    at: entry.occurredAt,
    phrase: phraseFor(entry.type),
    actor,
    subject: subjectOf(entry.metadata),
    outcome: toneOf(entry.outcome),
  }
}

export const vaultEvent = (event: RawVault, index: number): FeedItem => ({
  id: `vault:${event.at}:${index}`,
  at: event.at,
  phrase: phraseFor(event.action),
  actor: event.who === 'admin' ? { kind: 'you' } : event.who.startsWith('project:') ? { kind: 'app' } : { kind: 'pikku' },
  subject: event.key,
  outcome: toneOf(event.outcome === 'success' ? undefined : event.outcome),
})

export type RawStudio = { at: string; type: string; subject: string | null; project: string | null; outcome: 'success' | 'failed' }

const STUDIO: Record<string, Phrase> = {
  'account.sign_in': 'account_sign_in',
  'account.sign_out': 'account_sign_out',
  'project.publish': 'publish',
}

export const studioEvent = (event: RawStudio, index: number): FeedItem => ({
  id: `studio:${event.at}:${index}`,
  at: event.at,
  phrase: event.type === 'ai.choose' ? (event.subject === 'fabric' ? 'ai_hosted' : 'ai_own') : (STUDIO[event.type] ?? 'unknown'),
  actor: event.type === 'project.publish' ? { kind: 'pikku' } : { kind: 'you' },
  subject: null,
  outcome: event.outcome === 'failed' ? 'bad' : 'ok',
})

const CHANGE: Record<string, Phrase> = {
  open: 'change_asked',
  claimed: 'change_working',
  in_progress: 'change_working',
  needs_answer: 'change_needs_answer',
  done: 'change_done',
}

export const changeEvent = (change: RawChange): FeedItem | null => {
  if (change.status === 'dismissed') return null
  const done = change.status === 'done'
  return {
    id: `change:${change.changeId}:${change.status}`,
    at: done && change.updatedAt ? change.updatedAt : change.createdAt,
    phrase: CHANGE[change.status] ?? 'change_asked',
    actor: done || change.status === 'claimed' || change.status === 'in_progress' || change.status === 'needs_answer' ? { kind: 'pikku' } : { kind: 'you' },
    subject: change.title,
    outcome: change.status === 'needs_answer' ? 'warn' : 'ok',
  }
}

export const mergeFeed = (...lists: FeedItem[][]): FeedItem[] =>
  lists
    .flat()
    .filter((i) => !Number.isNaN(new Date(i.at).getTime()))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

export type DayGroup = 'today' | 'yesterday' | 'earlier'

export const groupByDay = (items: FeedItem[], now: number): Array<[DayGroup, FeedItem[]]> => {
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const today = start.getTime()
  const dayOf = (iso: string): DayGroup => {
    const t = new Date(iso).getTime()
    return t >= today ? 'today' : t >= today - 86_400_000 ? 'yesterday' : 'earlier'
  }
  const order: DayGroup[] = ['today', 'yesterday', 'earlier']
  return order.map((g): [DayGroup, FeedItem[]] => [g, items.filter((i) => dayOf(i.at) === g)]).filter(([, list]) => list.length > 0)
}
