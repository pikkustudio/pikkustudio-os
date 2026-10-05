import { m } from '@/i18n/messages'
import type { ReactNode } from 'react'
import { FileText, KeyRound, Settings, Workflow } from 'lucide-react'
import { versions, type Outcome, type Version } from '../mocks/versions'
import { Dot, RowCard } from './RowCard'

export type PartKind = 'Pages' | 'Routines' | 'Secret codes' | 'Settings'
export type Touch = { v: Version; word: 'New' | 'Changed' | 'Removed' }
export type Part = { name: string; kind: PartKind; touches: Touch[] }

export const kindIcon: Record<string, typeof FileText> = { Pages: FileText, Routines: Workflow, 'Secret codes': KeyRound, Settings }
export const kindWord = (): Record<string, string> => ({ Pages: m.part_card__page(), Routines: m.part_card__routine(), 'Secret codes': m.part_card__secret_code(), Settings: m.part_card__setting() })

/** The parts of the app, found from what each version changed. Newest version first. */
export function deriveParts(list: Version[] = versions): Part[] {
  const map = new Map<string, Part>()
  for (const v of list) {
    for (const g of v.groups) {
      const items: Array<[string, Touch['word']]> = [...g.added.map((x) => [x, 'New'] as [string, Touch['word']]), ...g.changed.map((x) => [x, 'Changed'] as [string, Touch['word']]), ...g.removed.map((x) => [x, 'Removed'] as [string, Touch['word']])]
      for (const [name, word] of items) {
        const p = map.get(name) ?? { name, kind: g.label as PartKind, touches: [] }
        p.touches.push({ v, word })
        map.set(name, p)
      }
    }
  }
  return [...map.values()]
}

export const pipTone = (o: Outcome) => (o === 'live' ? 'bg-success' : o === 'failed' ? 'border-2 border-destructive bg-card' : o === 'working' ? 'bg-info' : o === 'waiting' ? 'border-2 border-warning bg-card' : 'bg-muted-foreground')
export const pipWord = (o: Outcome) => ({ live: 'live', 'was-live': 'was live', failed: "didn't go live", 'rolled-back': 'went back', cancelled: 'cancelled', working: 'publishing', waiting: 'waiting' })[o]

/** Up to four small round pips: the last versions that touched a part, newest first. Decoration; the words beside it carry the meaning. */
export function PartTrail({ part }: { part: Part }) {
  const last = part.touches.slice(0, 4)
  return (
    <span className="inline-flex items-center gap-1.5" role="img" aria-label={`Last ${last.length} changes: ${last.map((t) => pipWord(t.v.outcome)).join(', ')}`}>
      {last.map((t) => (
        <i key={t.v.id} title={`${t.v.title}: ${pipWord(t.v.outcome)}`} className={`size-2.5 rounded-full ${pipTone(t.v.outcome)}`} />
      ))}
    </span>
  )
}

/** One part of the app as its own row card, with its trail and a History action. */
export function PartCard({ part, flag, tile, status, caption, note, children }: { part: Part; flag?: boolean; tile?: ReactNode; status: ReactNode; caption: ReactNode; note?: ReactNode; children?: ReactNode }) {
  const Icon = kindIcon[part.kind] ?? FileText
  return (
    <RowCard
      flag={flag}
      tile={tile ?? <Icon className="size-5" />}
      title={part.name}
      caption={caption}
      note={
        <span className="flex flex-wrap items-center gap-2.5">
          <PartTrail part={part} />
          {note}
        </span>
      }
    >
      {status}
      {children}
    </RowCard>
  )
}

export { Dot }
