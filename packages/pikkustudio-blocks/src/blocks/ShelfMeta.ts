import { BellRing, CalendarPlus, CalendarX, Camera, CreditCard, Flag, Mail, Type, type LucideIcon } from 'lucide-react'
import type { Outcome, Version } from '../mocks/versions'
import type { ShelfHue } from './ShelfArt'

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

export const shelfWords: Record<Outcome, string> = { live: 'Live', 'was-live': 'Was live', failed: "Didn't go live", 'rolled-back': 'Went back from it', cancelled: 'Cancelled', working: 'Publishing', waiting: 'Waiting for you' }
export const shelfTone: Record<Outcome, 'ok' | 'warn' | 'bad' | 'quiet'> = { live: 'ok', 'was-live': 'quiet', failed: 'bad', 'rolled-back': 'quiet', cancelled: 'quiet', working: 'ok', waiting: 'warn' }

export const failWords = { build: 'It could not be built', start: 'It built, but would not start', publish: 'It could not be put live', data: 'Your data could not be updated' }

export const when = (v: Version) => `${v.day}, ${v.time}`
export const who = (v: Version) => (v.by === 'GitHub' ? 'Saved from GitHub' : v.by)
