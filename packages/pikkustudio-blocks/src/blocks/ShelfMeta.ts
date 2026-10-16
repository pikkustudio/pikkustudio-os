import { m } from '@/i18n/messages'
import { Flag, type LucideIcon } from 'lucide-react'
import type { Outcome, Version } from '../lib/versions'
import type { ShelfHue } from './ShelfArt'
import type { I18nString } from '@pikku/react'

export const shelfPart = (v: Version): { icon: LucideIcon; hue: ShelfHue } => {
  const p = { icon: Flag, hue: 'teal' as ShelfHue }
  return v.outcome === 'failed' || v.outcome === 'cancelled' ? { icon: p.icon, hue: 'grey' } : p
}

/** Only versions that actually ran can be gone back to. */
export const ran = (o: Outcome) => o === 'live' || o === 'was-live' || o === 'rolled-back'
export const canGoBack = (o: Outcome) => o === 'was-live'

export const shelfWords: Record<Outcome, () => I18nString> = { live: m.shelf_meta__live, 'was-live': m.shelf_meta__was_live, failed: m.shelf_meta__failed, 'rolled-back': m.shelf_meta__rolled_back, cancelled: m.shelf_meta__cancelled, working: m.shelf_meta__working, waiting: m.shelf_meta__waiting }
export const shelfTone: Record<Outcome, 'ok' | 'warn' | 'bad' | 'quiet'> = { live: 'ok', 'was-live': 'quiet', failed: 'bad', 'rolled-back': 'quiet', cancelled: 'quiet', working: 'ok', waiting: 'warn' }

export const failWords = { build: m.shelf_meta__fail_build, start: m.shelf_meta__fail_start, publish: m.shelf_meta__fail_publish, data: m.shelf_meta__fail_data }

export const when = (v: Version): I18nString => m.versions__day_time({ day: v.day, time: v.time })
export const who = (v: Version): I18nString => (v.by === 'GitHub' ? m.shelf_meta__saved_from_github() : v.by)
