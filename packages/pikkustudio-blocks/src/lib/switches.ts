export type Switch = {
  name: string
  description?: string
  anyOf?: string[]
  enabled: boolean
  rolloutPercent: number | null
  declared: boolean
  backed: boolean
}

export type SwitchList = { flags: Switch[]; writable: boolean }

export type SwitchSubject = { organizationId?: string; userId?: string }

export type SwitchException = { subjectId: string; subjectKind: string; enabled: boolean; grantedBy?: string; grantedAt?: string }

export type SwitchExceptions = { overrides: SwitchException[]; supported: boolean }

export type SwitchState = 'off' | 'everyone' | 'some' | 'unset' | 'unused'

export const everyone = (s: Pick<Switch, 'rolloutPercent'>) => s.rolloutPercent === null || s.rolloutPercent >= 100

export const switchState = (s: Switch): SwitchState => {
  if (!s.declared) return 'unused'
  if (!s.backed) return 'unset'
  if (!s.enabled) return 'off'
  return everyone(s) ? 'everyone' : 'some'
}

export const needsLook = (s: Switch) => !s.declared || !s.backed

export const switchTitle = (name: string) => {
  const spaced = name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[._:-]+/g, ' ')
    .trim()
    .toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export const subjectOf = (kind: string, id: string): SwitchSubject => (kind === 'organization' ? { organizationId: id } : { userId: id })

export const SWITCH_RPCS = ['admin:flagList', 'admin:flagOverrides']
