import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Dot } from './RowCard'
import { ShelfArt, ShelfLabel, type ShelfHue } from './ShelfArt'

/**
 * One saved version as a named save slot: flat art on top, its plain title, one sentence, a status line, who and when, one action.
 * `wide` lays the art beside the text (the live stage). `flag` is the amber border for "needs you"; `dashed` is a saved-but-not-published slot.
 */
export function ShelfTile({ hue, icon, label, title, text, status, tone = 'quiet', meta, safe, flag, dashed, wide, children }: { hue: ShelfHue; icon: LucideIcon; label?: string; title: ReactNode; text: string; status: string; tone?: 'ok' | 'warn' | 'bad' | 'quiet'; meta: string; safe?: boolean; flag?: boolean; dashed?: boolean; wide?: boolean; children?: ReactNode }) {
  return (
    <article className={`flex gap-3.5 rounded-card border bg-card p-3 shadow-card ${wide ? 'flex-row items-stretch' : 'flex-col'} ${flag ? 'border-warning' : dashed ? 'border-dashed border-border' : 'border-border'}`}>
      <ShelfArt hue={hue} icon={icon} safe={safe} className={wide ? 'w-[34%] min-h-44' : 'h-[128px]'} />
      <div className={`flex min-w-0 flex-1 flex-col gap-1.5 ${wide ? 'justify-center px-2' : 'px-1 pb-1'}`}>
        {label ? <ShelfLabel>{label}</ShelfLabel> : null}
        <b className="text-[17px] leading-[1.3] text-balance">{title}</b>
        <p className="text-[14px] text-ink-2 text-pretty">{text}</p>
        <Dot tone={tone}>{status}</Dot>
        <small className="text-[13px] text-muted-foreground">{meta}</small>
        {children ? <div className="mt-auto flex flex-wrap items-center gap-2 pt-2.5">{children}</div> : null}
      </div>
    </article>
  )
}
