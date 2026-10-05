import type { ReactNode } from 'react'

/** A stack of separate row cards, 8px apart. Rows are never joined into one table. */
export function RowStack({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>
}

/**
 * One item as its own white card: 44px icon tile, a bold name, a caption, then status and actions.
 * `bare` draws the tile as given (an avatar). `on` lights the tile in teal mist. `flag` is the amber border for "needs you".
 * `below` runs full width under the row, inside the same card.
 */
export function RowCard({ tile, bare, on, flag, title, caption, note, below, children }: { tile: ReactNode; bare?: boolean; on?: boolean; flag?: boolean; title: ReactNode; caption?: ReactNode; note?: ReactNode; below?: ReactNode; children?: ReactNode }) {
  return (
    <div className={`flex flex-col gap-3 rounded-card border bg-card px-3.5 py-3 shadow-card ${flag ? 'border-warning' : 'border-border'}`}>
      <div className="flex flex-wrap items-center gap-3.5">
        {bare ? (
          tile
        ) : (
          <span className={`grid size-11 shrink-0 place-items-center rounded-lg ${on ? 'bg-accent text-accent-foreground' : 'bg-secondary text-ink-2'}`} aria-hidden="true">
            {tile}
          </span>
        )}
        <span className="min-w-0 flex-1 basis-56">
          <b className="block text-[17px] leading-[1.3]">{title}</b>
          {caption ? <small className="block text-[14px] text-ink-2">{caption}</small> : null}
          {note ? <small className="block text-[13px] text-muted-foreground">{note}</small> : null}
        </span>
        {children}
      </div>
      {below}
    </div>
  )
}

/** State in words with a dot, never a bare number. */
export function Dot({ tone = 'ok', children }: { tone?: 'ok' | 'warn' | 'bad' | 'quiet'; children: ReactNode }) {
  const c = tone === 'ok' ? 'bg-success' : tone === 'warn' ? 'bg-warning' : tone === 'bad' ? 'bg-destructive' : 'bg-muted-foreground'
  return (
    <span className="inline-flex items-center gap-2 text-[14px] font-semibold text-ink-2">
      <i className={`size-2.5 rounded-full ${c}`} aria-hidden="true" />
      {children}
    </span>
  )
}
