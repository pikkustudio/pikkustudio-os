import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'

export type AuditUser = { name?: string; email?: string; actor?: boolean }
export type AuditEntry = {
  eventId?: string
  type: string
  source: 'auto' | 'explicit'
  outcome?: 'success' | 'failed' | 'denied'
  occurredAt: string
  userIdentity?: { userId?: string; pikkuUserId?: string }
  metadata?: Record<string, unknown>
}

const did: Record<string, () => I18nString> = {
  'secret.read': () => m.audit_screen__did_secret_read(),
  'secret.write': () => m.audit_screen__did_secret_write(),
  'secret.delete': () => m.audit_screen__did_secret_delete(),
  'token.mint': () => m.audit_screen__did_token_mint(),
  createUser: () => m.audit_screen__did_create_user(),
  removeUser: () => m.audit_screen__did_remove_user(),
  setUserBanned: () => m.audit_screen__did_ban_user(),
  setUserPassword: () => m.audit_screen__did_set_password(),
  sendSignInLink: () => m.audit_screen__did_sign_in_link(),
  revokeUserSessions: () => m.audit_screen__did_sign_out(),
  flagSetEnabled: () => m.audit_screen__did_switch(),
  flagSetOverride: () => m.audit_screen__did_switch(),
  flagSetRollout: () => m.audit_screen__did_switch(),
  flagClearOverride: () => m.audit_screen__did_switch_reset(),
  scopeCreateRole: () => m.audit_screen__did_group_create(),
  scopeDeleteRole: () => m.audit_screen__did_group_delete(),
  scopeSetRoleScopes: () => m.audit_screen__did_group_change(),
  scopeAddScopeToUser: () => m.audit_screen__did_group_change(),
  scopeRemoveScopeFromUser: () => m.audit_screen__did_group_change(),
  scopeAddUserToRole: () => m.audit_screen__did_group_add(),
  scopeRemoveUserFromRole: () => m.audit_screen__did_group_remove(),
  credentialSet: () => m.audit_screen__did_connection_set(),
  credentialDelete: () => m.audit_screen__did_connection_delete(),
  getAudits: () => m.audit_screen__did_look(),
  getAuditFilters: () => m.audit_screen__did_look(),
}

export const whatHappened = (type: string): I18nString => {
  const last = type.slice(type.lastIndexOf(':') + 1)
  return (did[type] ?? did[last] ?? (() => m.audit_screen__did_unknown()))()
}

export const whoDid = (entry: AuditEntry, users: Record<string, AuditUser> | undefined): I18nString => {
  const id = entry.userIdentity?.userId
  if (id) {
    const u = users?.[id]
    return asI18n(u?.name || u?.email || id)
  }
  return entry.userIdentity?.pikkuUserId ? m.audit_screen__someone() : m.audit_screen__studio()
}

export const outcomeOf = (entry: AuditEntry): { tone: 'ok' | 'warn' | 'bad'; text: I18nString } | null => {
  if (entry.outcome === 'success') return { tone: 'ok', text: m.audit_screen__done() }
  if (entry.outcome === 'failed') return { tone: 'bad', text: m.audit_screen__did_not_work() }
  if (entry.outcome === 'denied') return { tone: 'warn', text: m.audit_screen__not_allowed() }
  return null
}

export const ago = (iso: string, now: number): I18nString => {
  const at = new Date(iso).getTime()
  if (Number.isNaN(at)) return asI18n(iso)
  const minutes = Math.max(0, Math.floor((now - at) / 60_000))
  if (minutes < 1) return m.audit_screen__just_now()
  if (minutes < 2) return m.audit_screen__a_minute_ago()
  if (minutes < 60) return m.audit_screen__minutes_ago({ n: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 2) return m.audit_screen__an_hour_ago()
  if (hours < 24) return m.audit_screen__hours_ago({ n: hours })
  const days = Math.floor(hours / 24)
  if (days < 2) return m.audit_screen__yesterday_at()
  if (days < 7) return m.audit_screen__days_ago({ n: days })
  return asI18n(new Date(at).toLocaleDateString())
}

export const exactTime = (iso: string): I18nString => {
  const at = new Date(iso)
  return asI18n(Number.isNaN(at.getTime()) ? iso : at.toLocaleString(undefined, { dateStyle: 'long', timeStyle: 'short' }))
}

export const dayGroup = (iso: string, now: number): 'today' | 'yesterday' | 'older' => {
  const at = new Date(iso)
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const t = at.getTime()
  if (t >= start.getTime()) return 'today'
  if (t >= start.getTime() - 86_400_000) return 'yesterday'
  return 'older'
}

const label = (key: string): string => key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_.-]+/g, ' ').replace(/^./, (c) => c.toUpperCase())

export const extras = (metadata: Record<string, unknown> | undefined): Array<{ label: I18nString; value: I18nString }> =>
  Object.entries(metadata ?? {})
    .filter(([, v]) => ['string', 'number', 'boolean'].includes(typeof v))
    .map(([k, v]) => ({ label: asI18n(label(k)), value: asI18n(String(v)) }))
