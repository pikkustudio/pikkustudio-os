import { m } from '@/i18n/messages'
import { asI18n, sep, type I18nNode, type I18nString } from '@pikku/react'
import { Fragment, useState } from 'react'
import { Check, CircleAlert, Image, Clock, Loader, MessageCircle, Minus, Send, Undo2 } from 'lucide-react'
import { Button } from '../ui/button'
import { ChatMarkdown } from '../blocks/ChatMarkdown'
import { labelOf, REAL, type Change, type State } from './data'

const TONE: Record<State, string> = {
  needs: 'bg-warning text-on-warning',
  working: 'bg-info-soft text-info-foreground',
  waiting: 'bg-secondary text-ink-2',
  done: 'bg-success-soft text-success-foreground',
  aside: 'bg-secondary text-muted-foreground',
}

const ICON = { needs: CircleAlert, working: Loader, waiting: Clock, done: Check, aside: Minus }

export function Pill({ s, small }: { s: State; small?: boolean }) {
  const I = ICON[s]
  return (
    <span className={`inline-flex shrink-0 items-center self-start gap-1.5 rounded-full font-bold ${small ? 'px-2.5 py-0.5 text-[13px]' : 'px-3 py-1 text-[14px]'} ${TONE[s]}`}>
      <I className={`size-3.5 ${s === 'working' ? 'animate-spin [animation-duration:3s]' : ''}`} />
      {labelOf(s)}
    </span>
  )
}

/** Small facts on one line, with a quiet dot between them. */
export function Meta({ items }: { items: (I18nString | undefined)[] }) {
  const shown = items.filter((x): x is I18nString => !!x)
  return (
    <>
      {shown.map((x, i) => (
        <Fragment key={i}>
          {i > 0 ? sep(' · ') : null}
          {x}
        </Fragment>
      ))}
    </>
  )
}

export function WhatChanges({ c }: { c: Change }) {
  const [more, setMore] = useState(false)
  return (
    <section className="flex flex-col gap-3 rounded-[18px] bg-secondary p-5">
      <b className="font-heading text-[18px]">{c.state === 'done' ? m.parts__what_changed() : m.parts__what_will_differ()}</b>
      <ul className="flex flex-col gap-2 text-[16px]">
        {c.what.map((w) => (
          <li key={w} className="flex gap-2.5">
            <span className="mt-0.5 grid size-5.5 shrink-0 place-items-center rounded-full bg-success-soft text-success-foreground">
              <Check className="size-3.5" />
            </span>
            {w}
          </li>
        ))}
        {c.nothing?.map((w) => (
          <li key={w} className="flex gap-2.5 text-ink-2">
            <span className="mt-0.5 grid size-5.5 shrink-0 place-items-center rounded-full bg-card text-muted-foreground">
              <Minus className="size-3.5" />
            </span>
            {w}
          </li>
        ))}
      </ul>
      <button type="button" aria-expanded={more} onClick={() => setMore((v) => !v)} className="self-start text-[14px] font-bold text-accent-foreground hover:underline">
        {more ? m.parts__hide_details() : m.parts__show_details()}
      </button>
      {more ? <pre dir="ltr" className="overflow-auto rounded-xl bg-card p-3.5 font-mono text-[13px] leading-[1.6] text-ink-2">{c.details}</pre> : null}
    </section>
  )
}

export function Thread({ c, compact }: { c: Change; compact?: boolean }) {
  const [draft, setDraft] = useState('')
  const [sent, setSent] = useState<I18nString[]>([])
  return (
    <section className="flex flex-col gap-3" aria-label={m.parts__conversation()}>
      {!compact ? <b className="font-heading text-[18px]">{m.parts__conversation()}</b> : null}
      {c.thread.length + sent.length === 0 ? <p className="text-[15px] text-ink-2">{m.parts__nothing_said()}</p> : null}
      {c.thread.map((msg, i) => (
        <Bubble key={i} me={msg.who === 'you'} when={msg.when}>
          {msg.who === 'you' ? msg.text : <ChatMarkdown>{msg.text}</ChatMarkdown>}
        </Bubble>
      ))}
      {sent.map((t, i) => (
        <Bubble key={`s${i}`} me when={m.content_tree__just_now()}>
          {t}
        </Bubble>
      ))}
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          const text = draft.trim()
          if (!text) return
          setSent((s) => [...s, asI18n(text)])
          setDraft('')
        }}
      >
        <label className="flex-1">
          <span className="sr-only">{m.parts__write_about()}</span>
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={c.asks ? m.parts__answer_pikku() : m.parts__write_placeholder()} className="h-12 w-full rounded-full border-[1.5px] border-input bg-card px-5 text-[16px] outline-none focus:border-primary" />
        </label>
        <Button type="submit" variant="default" size="page" aria-label={m.parts__send()}>
          <Send className="size-4.5" />
        </Button>
      </form>
    </section>
  )
}

function Bubble({ me, when, children }: { me?: boolean; when: I18nString; children: I18nNode }) {
  return (
    <div className={`flex flex-col gap-1 ${me ? 'items-end' : 'items-start'}`}>
      <div className={`max-w-5/6 rounded-[18px] px-4 py-2.5 text-[16px] leading-[1.5] ${me ? 'rounded-ee-[4px] bg-accent' : 'rounded-es-[4px] bg-secondary'}`}>{children}</div>
      <span className="px-1 text-[13px] text-muted-foreground">
        {me ? m.parts__you() : m.parts__pikku()}{sep(' · ')}{when}
      </span>
    </div>
  )
}

export function Actions({ c, size = 'page' }: { c: Change; size?: 'page' | 'compact' }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      {c.state === 'needs' ? (
        <>
          {REAL[c.id].approval ? (
            <Button variant="default" size={size}>
              
              {m.parts__approve_and_keep_it()}
            </Button>
          ) : null}
          <Button variant="bordered" size={size}>
            
            {m.shell_layout__not_now()}
          </Button>
        </>
      ) : null}
      {c.state === 'working' || c.state === 'waiting' ? (
        <Button variant="bordered" size={size}>
          
          {m.parts__set_aside()}
        </Button>
      ) : null}
      {c.state === 'aside' ? (
        <Button variant="bordered" size={size}>
          
          {m.parts__bring_it_back()}
        </Button>
      ) : null}
      {c.state === 'done' ? (
        <Button variant="bordered" size={size}>
          <Undo2 className="rtl:-scale-x-100 size-4.5" />
          {m.parts__take_it_back()}
        </Button>
      ) : null}
    </div>
  )
}

export function Asks({ c }: { c: Change }) {
  const [chosen, setChosen] = useState<I18nString | null>(null)
  if (!c.asks) return null
  const options = REAL[c.id].options ?? []
  const shots = (REAL[c.id].evidence ?? []).filter((e) => e.kind === 'option')
  return (
    <div className="flex flex-col gap-3 rounded-[18px] border-[1.5px] border-warning bg-card p-4">
      <div className="flex gap-3">
        <MessageCircle className="mt-0.5 size-5 shrink-0 text-warning-foreground" />
        <div>
          <b className="block text-[14px] text-warning-foreground">{m.parts__pikku_is_asking()}</b>
          <p className="text-[16px]">{c.asks}</p>
        </div>
      </div>
      {shots.length ? (
        <div className="grid grid-cols-2 gap-2.5">
          {shots.map((s) => (
            <div key={s.label} className="flex flex-col gap-1.5">
              <div className="grid h-24 place-items-center rounded-xl bg-secondary text-muted-foreground">
                <Image className="size-6" />
              </div>
              <span className="text-[13px] text-ink-2">{s.label}</span>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={m.parts__pick_answer()}>
        {options.map((o) => (
          <button key={o} type="button" role="radio" aria-checked={chosen === o} onClick={() => setChosen(o)} className={`rounded-full border-[1.5px] px-4 py-1.5 text-[15px] ${chosen === o ? 'border-primary bg-accent font-bold' : 'border-input bg-card'}`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

export function SideFrame({ children, title = m.parts__talk_to_pikku() }: { children: I18nNode; title?: I18nString }) {
  return (
    <aside className="flex w-88 shrink-0 flex-col self-start overflow-hidden rounded-[22px] border border-border bg-card shadow-[0_24px_56px_-14px_rgba(8,40,52,0.25)]" aria-label={m.parts__sidebar_label()}>
      <div className="flex items-center gap-2 border-b border-border px-5 py-3.5">
        <h2 className="flex-1 text-[20px] font-bold">{title}</h2>
        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[12px] font-bold text-ink-2">{m.parts__proposed_sidebar()}</span>
      </div>
      {children}
      <div className="flex flex-col gap-3 px-5 py-4">
        <div className="max-w-5/6 self-start rounded-[18px] rounded-es-[4px] bg-secondary px-4 py-2.5 text-[15px] leading-[1.5]">{m.parts__here_whenever()}</div>
        <div className="h-11 rounded-full border-[1.5px] border-input px-4 text-[15px] leading-10 text-muted-foreground">{m.parts__ask_pikku()}</div>
      </div>
    </aside>
  )
}
