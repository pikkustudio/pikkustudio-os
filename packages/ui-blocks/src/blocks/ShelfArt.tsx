import type { I18nNode } from '@pikku/react'
import { m } from '@/i18n/messages'
import type { LucideIcon } from 'lucide-react'
import { Check } from 'lucide-react'

export type ShelfHue = 'teal' | 'petrol' | 'sea' | 'grey'

/** A flat colour field with overlapping circles and one icon for the part that changed. Never a screenshot. */
export function ShelfArt({ hue, icon: Icon, className = 'h-[128px]', safe }: { hue: ShelfHue; icon: LucideIcon; className?: string; safe?: boolean }) {
  const grey = hue === 'grey'
  return (
    <div data-hue={grey ? undefined : hue} className={`relative shrink-0 overflow-hidden rounded-xl ${grey ? 'bg-secondary' : 'bg-hero'} ${className}`}>
      <svg viewBox="0 0 300 130" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden="true">
        <circle cx="240" cy="20" r="95" className={grey ? 'fill-surface-3' : 'fill-w1'} />
        <circle cx="40" cy="140" r="80" className={grey ? 'fill-border' : 'fill-w2'} />
        <circle cx="170" cy="95" r="46" className={grey ? 'fill-surface-3' : 'fill-w3'} />
      </svg>
      <span className={`absolute top-1/2 start-1/2 grid size-14 -translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 place-items-center rounded-full ${grey ? 'bg-card text-ink-2' : 'bg-hero-btn text-hero-btn-ink'}`} aria-hidden="true">
        <Icon className="size-7" />
      </span>
      {safe ? (
        <span className="absolute top-2.5 start-2.5 inline-flex items-center gap-1.5 rounded-full bg-card px-3 py-1 text-[13px] font-bold text-success-foreground">
          <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
          
          {m.shelf_art__safe_to_go_back()}
        </span>
      ) : null}
    </div>
  )
}

export function ShelfLabel({ children }: { children: I18nNode }) {
  return <span className="text-[14px] font-bold text-muted-foreground">{children}</span>
}
