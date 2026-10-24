import { type I18nNode, asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { Check, LoaderCircle, TriangleAlert, Undo2, X, Clock } from 'lucide-react'

export type RoadNodeKind = 'live' | 'past' | 'hollow' | 'failed' | 'cancelled' | 'waiting' | 'working' | 'back'

/** A 16px stop on the road. Colour is always paired with a shape. */
export function RoadNode({ kind }: { kind: RoadNodeKind }) {
  const base = 'grid size-5 place-items-center rounded-full'
  if (kind === 'live') return <span className={`${base} bg-success text-white`}><Check className="size-3.5" strokeWidth={3} /></span>
  if (kind === 'past') return <span className={`${base} border-2 border-success bg-card text-success`}><Check className="size-3" strokeWidth={3} /></span>
  if (kind === 'failed') return <span className={`${base} bg-card text-destructive`}><TriangleAlert className="size-5" /></span>
  if (kind === 'cancelled') return <span className={`${base} border-2 border-muted-foreground bg-card text-muted-foreground`}><X className="size-3" strokeWidth={3} /></span>
  if (kind === 'waiting') return <span className={`${base} bg-card text-warning-foreground`}><Clock className="size-5" /></span>
  if (kind === 'working') return <span className={`${base} bg-card text-info`}><LoaderCircle className="size-5 animate-spin" /></span>
  if (kind === 'back') return <span className={`${base} border-2 border-muted-foreground bg-card text-ink-2`}><Undo2 className="rtl:-scale-x-100 size-3" strokeWidth={3} /></span>
  return <span className={`${base} border-2 border-input bg-card`} />
}

/**
 * One stop on the road: a gutter with the 2px spine and a node, then the content (usually a RowCard).
 * `side` steps the node off to the right on a dashed connector, so the spine carries on without it.
 * The spine is a neutral hairline outside the card, never a stripe on it.
 */
export function RoadStop({ kind, side, first, last, dashed, children }: { kind: RoadNodeKind; side?: boolean; first?: boolean; last?: boolean; dashed?: boolean; children: I18nNode }) {
  const gutter = side ? 56 : 28
  const nodeX = side ? 42 : 14
  return (
    <div className="relative pb-2" style={{ paddingInlineStart: gutter }}>
      <span aria-hidden="true" className={`absolute ${dashed ? 'border-s-2 border-dashed border-border' : 'bg-border'}`} style={{ insetInlineStart: 13, width: dashed ? 0 : 2, top: first ? 35 : 0, bottom: last ? 'calc(100% - 35px)' : 0 }} />
      {side ? <span aria-hidden="true" className="absolute h-0 border-t-2 border-dashed border-border" style={{ insetInlineStart: 14, width: 28, top: 34 }} /> : null}
      <span className="absolute -translate-x-1/2 rtl:translate-x-1/2" style={{ insetInlineStart: nodeX, top: 25 }}>
        <RoadNode kind={kind} />
      </span>
      {children}
    </div>
  )
}

/** The one divider: everything above is on its way, everything below already happened. */
export function RoadBand({ children }: { children: I18nNode }) {
  return (
    <div className="relative pb-2" style={{ paddingInlineStart: 28 }}>
      <span aria-hidden="true" className="absolute bg-border" style={{ insetInlineStart: 13, width: 2, top: 0, bottom: 0 }} />
      <span className="absolute -translate-x-1/2 rtl:translate-x-1/2" style={{ insetInlineStart: 14, top: 12 }}><RoadNode kind="live" /></span>
      <div className="flex min-h-11 items-center gap-2.5 rounded-full border-[1.5px] border-input bg-secondary px-5 py-2 text-[14px] font-bold text-ink">
        {children}
      </div>
    </div>
  )
}

/** Five labelled pips. The current one is the only thing on the page that moves. */
export function RoadStepStrip({ steps, phase }: { steps: Array<[string, number]>; phase: number }) {
  return (
    <ol className="flex flex-wrap gap-x-5 gap-y-2" aria-label={m.road_spine__step_of({ step: phase + 1, total: steps.length })}>
      {steps.map(([name, secs], i) => (
        <li key={name} className="flex items-center gap-2 text-[14px]">
          {i < phase ? <span className="grid size-5 place-items-center rounded-full bg-success text-white"><Check className="size-3.5" strokeWidth={3} /></span> : i === phase ? <LoaderCircle className="size-5 animate-spin text-info" /> : <span className="size-5 rounded-full border-2 border-input" />}
          <span className={i === phase ? 'font-bold text-ink' : 'text-ink-2'}>{asI18n(name)}</span>
          {i > phase ? <small className="text-[13px] text-muted-foreground">{m.road_spine__about_secs({ secs })}</small> : null}
        </li>
      ))}
    </ol>
  )
}
