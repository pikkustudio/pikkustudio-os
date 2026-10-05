import { m } from '@/i18n/messages'
import { useMemo, useState, type CSSProperties } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { AskPikku } from './AskPikku'
import { isRtl, languageName } from '../lib/i18n'
import type { Lang, TransString } from '../types/translations'

const STEP = 15
const MAX = 2
const section = (id: string) => (id.includes('__') ? id.split('__')[0] : 'other')
const nice = (k: string) => k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, ' ')

export function TransRows({ items, locales, baseLocale, set }: { items: TransString[]; locales: string[]; baseLocale: string; set: (id: string, lang: Lang, value: string) => void }) {
  const [on, setOn] = useState<string[]>(() => locales.slice(0, MAX))
  const [page, setPage] = useState('all')
  const [filter, setFilter] = useState('missing')
  const [q, setQ] = useState('')
  const [shut, setShut] = useState<string[]>([])
  const [grown, setGrown] = useState<Record<string, number>>({})
  const catalog = locales.map((id) => ({ id, name: languageName(id), rtl: isRtl(id) }))
  const cols = catalog.filter((l) => on.includes(l.id))
  const val = (s: (typeof items)[number], l: string) => s.values[l] ?? ''
  const put = (s: (typeof items)[number], l: string, v: string) => set(s.id, l, v)
  const gap = (s: (typeof items)[number]) => cols.some((c) => !val(s, c.id).trim())
  const flip = (id: string) => setOn((all) => (all.includes(id) ? all.filter((x) => x !== id) : all.length < MAX ? [...all, id] : all))
  const term = q.trim().toLowerCase()
  const total = items.length
  const lack = (l: string) => items.filter((s) => !val(s, l).trim()).length
  const pages = useMemo(() => [...new Set(items.map((s) => section(s.id)))], [items])
  const miss = (p: string) => items.filter((s) => section(s.id) === p && gap(s)).length
  const shown = items.filter((s) => (page === 'all' || section(s.id) === page) && (filter === 'all' || gap(s)) && `${s.base} ${cols.map((c) => val(s, c.id)).join(' ')}`.toLowerCase().includes(term))
  const order = [...pages].sort((a, b) => (a === 'other' ? 1 : b === 'other' ? -1 : miss(b) - miss(a)))
  const flat = Boolean(term)
  const grid = `grid items-center gap-x-4 gap-y-1 @min-[760px]:grid-cols-[minmax(0,1.4fr)_repeat(var(--n),minmax(0,2fr))]`
  const vars = { '--n': cols.length } as CSSProperties
  const row = (s: (typeof items)[number]) => (
    <li key={s.id} style={vars} className={`${grid} px-3.5 py-2`}>
      <span className="text-[15px] leading-[1.3] font-bold">
        {s.base}
        {flat ? <span className="ms-2 text-px13 font-normal text-muted-foreground">{nice(section(s.id))}</span> : null}
      </span>
      {cols.map((c) => (
        <Textarea key={c.id} tone="field" rows={1} dir={c.rtl ? 'rtl' : undefined} className={`min-h-10 py-2 ${val(s, c.id) ? '' : 'border-dashed border-warning bg-warning-soft'}`} value={val(s, c.id)} onChange={(e) => put(s, c.id, e.target.value)} placeholder="…" aria-label={`${s.base} in ${c.name}`} />
      ))}
    </li>
  )
  const list = 'm-0 flex list-none flex-col divide-y divide-border overflow-hidden rounded-card border border-border bg-card p-0 shadow-card'
  const needing = cols.some((c) => lack(c.id))
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={m.trans_rows__languages_to_show()}>
        <b className="me-1 text-px14 text-muted-foreground">{m.trans_rows__languages()}</b>
        <span className="rounded-full bg-secondary px-3.5 py-1.5 text-px14 font-bold text-ink-2">{languageName(baseLocale)} · {m.trans_rows__original()}</span>
        {catalog.map((l) => (
          <Button key={l.id} variant="filter" size="compactTight" type="button" aria-pressed={on.includes(l.id)} disabled={!on.includes(l.id) && on.length >= MAX} onClick={() => flip(l.id)}>
            {on.includes(l.id) ? <Check className="size-4" /> : null}
            {l.name}
          </Button>
        ))}
        <AskPikku label={m.trans_rows__add_a_language()} prompt={m.trans_rows__i_would_like_to()} />
        {on.length >= MAX ? <span className="text-px13 text-muted-foreground">{m.trans_rows__three_languages_at_most()}</span> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <Select value={page} onValueChange={setPage}>
          <SelectTrigger shape="pill" className="h-12 w-52 shrink-0 border-[1.5px] bg-field" aria-label={m.trans_rows__page()}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{m.trans_rows__all_pages()}</SelectItem>
            {pages.map((p) => <SelectItem key={p} value={p}>{nice(p)} · {m.trans_rows__left({ count: miss(p) })}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger shape="pill" className="h-12 w-40 shrink-0 border-[1.5px] bg-field" aria-label={m.trans_rows__show()}><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="missing">{m.trans_rows__only_missing()}</SelectItem><SelectItem value="all">{m.trans_rows__everything()}</SelectItem></SelectContent>
        </Select>
        <div className="relative min-w-52 flex-1">
          <Search className="absolute top-1/2 left-3.5 size-5.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" shape="pill" className="h-12 border-[1.5px] border-input bg-field pl-10.5 text-px16 shadow-none md:text-px16" placeholder={m.trans_rows__search_the_wording()} aria-label={m.trans_rows__search_the_wording()} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {cols.length ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-card border border-info/25 bg-info-soft px-4 py-3">
          <div className="flex min-w-48 flex-1 flex-col gap-2">
            <b className="text-[16px]">{needing ? m.trans_rows__still_needed() : m.trans_rows__everything_is_translated()}</b>
            <div className="flex flex-wrap gap-x-5 gap-y-1.5">
              {cols.map((c) => (
                <div key={c.id} className="flex min-w-36 flex-1 flex-col gap-1">
                  <span className="text-px13 font-bold"><bdi>{c.name}</bdi> · {Math.round(((total - lack(c.id)) / total) * 100)}%</span>
                  <div className="h-2 overflow-hidden rounded-full bg-card"><div className="h-full rounded-full bg-primary" style={{ width: `${((total - lack(c.id)) / total) * 100}%` }} /></div>
                </div>
              ))}
            </div>
          </div>
          {cols.some((c) => lack(c.id)) ? <AskPikku label={m.trans_rows__ask_pikku_to_translate()} prompt={`Please translate every missing phrase into ${cols.map((c) => c.name).join(' and ')}, then show me what you wrote to check.`} /> : null}
        </div>
      ) : <p className="px-2 text-ink-2">{m.trans_rows__pick_at_least_one()}</p>}
      {cols.length && shown.length === 0 ? <p className="px-2 text-ink-2">{m.trans_rows__nothing_here_everything_is()}</p> : null}
      {cols.length && shown.length ? (
        <div style={vars} className={`${grid} hidden px-3.5 text-px13 font-bold text-muted-foreground @min-[760px]:grid`}>
          <span>{languageName(baseLocale)}</span>
          {cols.map((c) => <bdi key={c.id}>{c.name}</bdi>)}
        </div>
      ) : null}
      {cols.length && flat ? (
        <>
          <p className="px-2 text-px14 text-muted-foreground">{m.trans_rows__found({ count: shown.length })}</p>
          <ul className={`@container/row ${list}`}>{shown.slice(0, 40).map(row)}</ul>
          {shown.length > 40 ? <p className="px-2 text-px14 text-muted-foreground">{m.trans_rows__showing_the_first_40()}</p> : null}
        </>
      ) : cols.length ? (
        order.map((p) => {
          const rows = shown.filter((s) => section(s.id) === p)
          if (!rows.length) return null
          const closed = shut.includes(p)
          const n = STEP + (grown[p] ?? 0)
          return (
            <section key={p} className="flex flex-col gap-2">
              <button type="button" aria-expanded={!closed} onClick={() => setShut(closed ? shut.filter((x) => x !== p) : [...shut, p])} className="flex w-full cursor-pointer items-center gap-2 px-1 pt-2 text-start">
                <ChevronDown className={`size-4 text-muted-foreground transition-transform ${closed ? '-rotate-90' : ''}`} />
                <h2 className="m-0 text-px14 font-bold text-muted-foreground">{nice(p)}</h2>
                <span className="text-px13 text-muted-foreground">{m.trans_rows__left_of({ left: miss(p), total: items.filter((s) => section(s.id) === p).length })}</span>
              </button>
              {closed ? null : (
                <>
                  <ul className={`@container/row ${list}`}>{rows.slice(0, n).map(row)}</ul>
                  {rows.length > n ? <Button variant="quiet" size="link" type="button" className="self-start px-1" onClick={() => setGrown({ ...grown, [p]: (grown[p] ?? 0) + STEP })}>{m.trans_rows__show_more({ shown: Math.min(STEP, rows.length - n), rest: rows.length - n })}</Button> : null}
                </>
              )}
            </section>
          )
        })
      ) : null}
    </div>
  )
}
