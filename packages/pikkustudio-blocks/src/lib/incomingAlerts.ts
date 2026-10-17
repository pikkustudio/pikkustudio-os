import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'

export type SourceMeta = { name: string; method: string | string[]; route: string; events: string[] }
export type SourceRow = { name: string; kind: string; declared: boolean; enabled: boolean; status: string | null; detail: string | null; baseUrl: string | null; updatedAt: string | null }
export type AlertSource = { name: string; meta: SourceMeta | null; row: SourceRow | null }

export type Delivery = { deliveryId: string; url: string; event: string | null; status: 'pending' | 'delivered' | 'failed'; attempts: number; createdAt: string; deliveredAt: string | null }
export type Attempt = { attemptId: string; attemptNumber: number; statusCode: number | null; responseBody: string | null; error: string | null; createdAt: string }
export type DeliveryDetailData = { delivery: Delivery; attempts: Attempt[] }

type Tone = 'ok' | 'warn' | 'bad' | 'quiet'

/** Source and event names come from the project's own code, so they are not ours to translate. */
export const alertName = (name: string): I18nString => {
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_\-.:]+/g, ' ').trim().toLowerCase()
  return asI18n(spaced.charAt(0).toUpperCase() + spaced.slice(1))
}

export const hostOf = (url: string): string => {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

export type SourceKind = 'orphan' | 'off' | 'connecting' | 'failed' | 'manual' | 'on'

export const sourceKind = ({ meta, row }: AlertSource): SourceKind => {
  if (row && !row.declared && !meta) return 'orphan'
  if (!row || !row.enabled) return 'off'
  if (!row.status) return 'connecting'
  if (row.status === 'failed') return 'failed'
  if (row.status === 'manual') return 'manual'
  return 'on'
}

export const sourceState = (s: AlertSource): { kind: SourceKind; tone: Tone; text: I18nString } => {
  const kind = sourceKind(s)
  if (kind === 'orphan') return { kind, tone: 'warn', text: m.incoming_alerts__state_orphan() }
  if (kind === 'off') return { kind, tone: 'quiet', text: m.incoming_alerts__state_off() }
  if (kind === 'connecting') return { kind, tone: 'quiet', text: m.incoming_alerts__state_connecting() }
  if (kind === 'failed') return { kind, tone: 'bad', text: m.incoming_alerts__state_failed() }
  if (kind === 'manual') return { kind, tone: 'warn', text: m.incoming_alerts__state_manual() }
  return { kind, tone: 'ok', text: m.incoming_alerts__state_on() }
}

export const deliveryState = (d: Delivery): { kind: Delivery['status']; tone: Tone; text: I18nString } =>
  d.status === 'delivered'
    ? { kind: d.status, tone: 'ok', text: m.incoming_alerts__delivered() }
    : d.status === 'failed'
      ? { kind: d.status, tone: 'bad', text: m.incoming_alerts__not_delivered() }
      : { kind: d.status, tone: 'quiet', text: m.incoming_alerts__still_trying() }

export const mergeSources = (meta: Record<string, SourceMeta> | undefined, rows: SourceRow[] | undefined): AlertSource[] => {
  const byName = new Map((rows ?? []).map((r) => [r.name, r]))
  const names = new Set([...Object.keys(meta ?? {}), ...byName.keys()])
  return [...names].sort().map((name) => ({ name, meta: meta?.[name] ?? null, row: byName.get(name) ?? null }))
}
