import { m } from '@/i18n/messages'
import type { I18nNode, I18nString } from '@pikku/react'
import { ArrowRight, BookmarkPlus, Check, MessageCircle } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'

export type RowKey = 'money' | 'start' | 'auto' | 'screens'
export type Wire = 'plans' | 'calendar' | 'book' | 'pay' | 'account' | 'receipt' | 'credits' | 'list'

export type Auto =
  | { kind: 'workflow'; title: I18nString; steps: I18nString[] }
  | { kind: 'agent'; title: I18nString; says: I18nString; tools: I18nString[] }

export type Setup = {
  id: string
  name: I18nString
  line: I18nString
  money: { text: I18nString; unique?: boolean }
  start: { text: I18nString; steps: I18nString[]; unique?: boolean }
  auto: { runs: Auto; person: I18nString; unique?: boolean }
  screens: { items: Array<{ name: I18nString; wire: Wire }>; unique?: boolean }
}

const bar = 'h-1.5 rounded-full bg-surface-3'

function Wireframe({ kind }: { kind: Wire }) {
  const body: Record<Wire, I18nNode> = {
    plans: (
      <div className="grid grid-cols-3 gap-1">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-1 rounded-sm bg-surface-2 p-1">
            <i className={`${bar} w-full`} />
            <i className="h-3 rounded-sm bg-accent" />
          </div>
        ))}
      </div>
    ),
    calendar: (
      <div className="grid grid-cols-5 gap-0.5">
        {Array.from({ length: 15 }).map((_, i) => (
          <i key={i} className={`h-2.5 rounded-sm ${i % 4 === 1 ? 'bg-accent' : 'bg-surface-2'}`} />
        ))}
      </div>
    ),
    book: <div className="flex flex-col gap-1"><i className={`${bar} w-3/4`} /><i className={`${bar} w-1/2`} /><i className="mt-1 h-3 w-1/2 rounded-full bg-primary" /></div>,
    pay: (
      <div className="flex flex-col gap-1">
        <i className="h-3 rounded-full bg-surface-2" />
        <i className="h-3 rounded-full bg-surface-2" />
        <i className="mt-1 h-3.5 rounded-full bg-primary" />
      </div>
    ),
    account: (
      <div className="flex items-center gap-1.5">
        <i className="size-6 rounded-full bg-accent" />
        <span className="flex flex-1 flex-col gap-1"><i className={`${bar} w-full`} /><i className={`${bar} w-2/3`} /></span>
      </div>
    ),
    receipt: (
      <div className="flex flex-col items-center gap-1">
        <i className="grid size-5 place-items-center rounded-full bg-success-soft text-success-foreground"><Check className="size-3" /></i>
        <i className={`${bar} w-3/4`} />
        <i className={`${bar} w-1/2`} />
      </div>
    ),
    credits: (
      <div className="flex flex-wrap gap-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <i key={i} className={`size-3.5 rounded-full ${i < 6 ? 'bg-primary' : 'bg-surface-3'}`} />
        ))}
      </div>
    ),
    list: <div className="flex flex-col gap-1"><i className={`${bar} w-full`} /><i className={`${bar} w-full`} /><i className={`${bar} w-2/3`} /></div>,
  }
  return <div className="h-18 rounded-md border border-border bg-card p-2" aria-hidden="true">{body[kind]}</div>
}

function Flow({ runs }: { runs: Auto }) {
  if (runs.kind === 'workflow')
    return (
      <div className="flex flex-col gap-2">
        <small className="text-[13px] font-bold text-ink-2">{runs.title}</small>
        <ol className="flex flex-wrap items-center gap-1.5">
          {runs.steps.map((s, i) => (
            <li key={s} className="flex items-center gap-1.5">
              <span className="rounded-md border border-border bg-secondary px-2 py-1 text-[13px] font-semibold">{s}</span>
              {i < runs.steps.length - 1 ? <ArrowRight className="rtl:-scale-x-100 size-3.5 text-muted-foreground" aria-hidden="true" /> : null}
            </li>
          ))}
        </ol>
      </div>
    )
  return (
    <div className="flex flex-col gap-2">
      <small className="text-[13px] font-bold text-ink-2">{runs.title}</small>
      <div className="flex items-start gap-2">
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground" aria-hidden="true"><MessageCircle className="size-4" /></span>
        <p className="rounded-2xl rounded-ss-sm bg-secondary px-3 py-2 text-[14px]">{runs.says}</p>
      </div>
      <div className="flex flex-wrap gap-1.5 ps-9">
        {runs.tools.map((t) => <Badge key={t} variant="tag">{t}</Badge>)}
      </div>
    </div>
  )
}

export const rowLabels = (): Record<RowKey, { label: I18nString; hint: I18nString }> => ({
  money: { label: m.setups_compare__row_money(), hint: m.setups_compare__row_money_hint() },
  start: { label: m.setups_compare__row_start(), hint: m.setups_compare__row_start_hint() },
  auto: { label: m.setups_compare__row_auto(), hint: m.setups_compare__row_auto_hint() },
  screens: { label: m.setups_compare__row_screens(), hint: m.setups_compare__row_screens_hint() },
})

function Row({ row, unique, saved, onWish, children }: { row: RowKey; unique?: boolean; saved: boolean; onWish: () => void; children: I18nNode }) {
  const l = rowLabels()[row]
  return (
    <section className={`flex flex-col gap-2.5 border-t border-border px-5 py-4 ${unique ? 'bg-accent/40' : ''}`}>
      <div className="flex items-start justify-between gap-2">
        <span>
          <b className="block text-[15px] leading-[1.3]">{l.label}</b>
          {unique ? <Badge variant="pillInfo" className="mt-1">{m.setups_compare__different_here()}</Badge> : null}
        </span>
        <Button variant="soft" size="chipSm" onClick={onWish} aria-pressed={saved} disabled={saved}>
          {saved ? <Check /> : <BookmarkPlus />}
          {saved ? m.setups_compare__on_wishlist() : m.setups_compare__add_wishlist()}
        </Button>
      </div>
      {children}
    </section>
  )
}

export function SetupColumn({ setup, saved, onWish, onDo }: { setup: Setup; saved: Set<string>; onWish: (row: RowKey) => void; onDo: () => void }) {
  const has = (r: RowKey) => saved.has(`${setup.id}:${r}`)
  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-card shadow-card">
      <header className="flex flex-col gap-3 px-5 pt-5 pb-4">
        <h2 className="text-[24px] leading-[1.2] font-bold tracking-[-0.012em]">{setup.name}</h2>
        <p className="text-[15px] text-ink-2">{setup.line}</p>
        <Button size="page" onClick={onDo} className="self-start">{m.setups_compare__do_this()}</Button>
      </header>
      <Row row="money" unique={setup.money.unique} saved={has('money')} onWish={() => onWish('money')}>
        <p className="text-[15px]">{setup.money.text}</p>
      </Row>
      <Row row="start" unique={setup.start.unique} saved={has('start')} onWish={() => onWish('start')}>
        <p className="text-[15px]">{setup.start.text}</p>
        <ol className="flex flex-wrap items-center gap-1.5">
          {setup.start.steps.map((s, i) => (
            <li key={s} className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-2">
              <i className="grid size-5 place-items-center rounded-full bg-secondary text-[12px] not-italic">{i + 1}</i>
              {s}
              {i < setup.start.steps.length - 1 ? <ArrowRight className="rtl:-scale-x-100 size-3.5 text-muted-foreground" aria-hidden="true" /> : null}
            </li>
          ))}
        </ol>
      </Row>
      <Row row="auto" unique={setup.auto.unique} saved={has('auto')} onWish={() => onWish('auto')}>
        <Flow runs={setup.auto.runs} />
        <p className="text-[14px] text-ink-2">{setup.auto.person}</p>
      </Row>
      <Row row="screens" unique={setup.screens.unique} saved={has('screens')} onWish={() => onWish('screens')}>
        <div className="grid grid-cols-3 gap-2">
          {setup.screens.items.map((s) => (
            <figure key={s.name} className="flex flex-col gap-1.5">
              <Wireframe kind={s.wire} />
              <figcaption className="text-[13px] font-semibold text-ink-2">{s.name}</figcaption>
            </figure>
          ))}
        </div>
      </Row>
    </article>
  )
}
