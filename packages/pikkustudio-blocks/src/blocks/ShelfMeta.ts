import { m } from '@/i18n/messages'
import { Flag, type LucideIcon } from 'lucide-react'
import { asI18n, type I18nString } from '@pikku/react'
import type { Release, ReleaseStatus } from '../lib/releases'
import type { ShelfHue } from './ShelfArt'

export const shelfPart = (v: Release): { icon: LucideIcon; hue: ShelfHue } =>
  v.status === 'failed' || v.status === 'cancelled' ? { icon: Flag, hue: 'grey' } : { icon: Flag, hue: 'teal' }

export const ran = (o: ReleaseStatus) => o === 'live' || o === 'was-live' || o === 'rolled-back'
export const canGoBack = (o: ReleaseStatus) => o === 'was-live' || o === 'rolled-back'

export const shelfWords: Record<ReleaseStatus, () => I18nString> = { live: m.shelf_meta__live, 'was-live': m.shelf_meta__was_live, failed: m.shelf_meta__failed, 'rolled-back': m.shelf_meta__rolled_back, cancelled: m.shelf_meta__cancelled, working: m.shelf_meta__working, waiting: m.shelf_meta__waiting }
export const shelfTone: Record<ReleaseStatus, 'ok' | 'warn' | 'bad' | 'quiet'> = { live: 'ok', 'was-live': 'quiet', failed: 'bad', 'rolled-back': 'quiet', cancelled: 'quiet', working: 'ok', waiting: 'warn' }

export const failWords = { build: m.shelf_meta__fail_build, start: m.shelf_meta__fail_start, publish: m.shelf_meta__fail_publish, data: m.shelf_meta__fail_data }

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

export const dayTime = (at: number): I18nString => {
  const d = new Date(at)
  const day = sameDay(d, new Date()) ? m.versions__today() : asI18n(d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }))
  return m.versions__day_time({ day, time: asI18n(d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })) })
}

export const ago = (at: number): I18nString => {
  const minutes = Math.max(0, Math.round((Date.now() - at) / 60000))
  if (minutes < 1) return m.versions__just_now()
  if (minutes < 60) return m.versions__minutes_ago({ count: minutes })
  const hours = Math.round(minutes / 60)
  if (hours < 24) return m.versions__hours_ago_count({ count: hours })
  return dayTime(at)
}

export const when = (v: Release): I18nString => dayTime(v.at)
export const who = (v: { by: string | null }): I18nString => (v.by ? asI18n(v.by) : m.shelf_meta__someone())
export const titleOf = (v: Release): I18nString => (v.title ? asI18n(v.title) : m.shelf_meta__version_named({ version: v.version }))
