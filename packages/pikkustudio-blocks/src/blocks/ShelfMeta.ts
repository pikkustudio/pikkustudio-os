import { m } from '@/i18n/messages'
import { BellRing, CalendarPlus, CalendarX, Camera, CreditCard, Flag, Mail, Type, type LucideIcon } from 'lucide-react'
import type { Outcome, Version } from '../mocks/versions'
import type { ShelfHue } from './ShelfArt'
import type { I18nString } from '@pikku/react'

/** The part each version changed, shown as one icon on its flat art. Derived here, not in the data. */
const part: Record<string, { icon: LucideIcon; hue: ShelfHue }> = {
  v9: { icon: CreditCard, hue: 'teal' },
  v8: { icon: CalendarPlus, hue: 'petrol' },
  v7: { icon: Mail, hue: 'sea' },
  v6: { icon: Camera, hue: 'teal' },
  v5: { icon: BellRing, hue: 'petrol' },
  v4: { icon: Type, hue: 'sea' },
  v3: { icon: Flag, hue: 'teal' },
  v2: { icon: CalendarX, hue: 'sea' },
}

export const shelfPart = (v: Version): { icon: LucideIcon; hue: ShelfHue } => {
  const p = part[v.id] ?? { icon: Flag, hue: 'teal' as ShelfHue }
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
