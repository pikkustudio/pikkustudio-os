import { type I18nString, asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Activity, BookOpen, Bot, Gauge, Compass, FileCode, FileText, FolderOpen, Globe, Palette, KeyRound, LayoutGrid, Mail, ScrollText, Search, Smartphone, Upload, Users, UserRoundCheck, Workflow, History } from 'lucide-react'
import { keep } from '../lib/links'

type Hit = { key: string; label: string; hint: string; id: string; Icon: typeof Search }

const pages = (): Hit[] => (
  [
    [m.quick_find__projects(), '/projects', FolderOpen],
    [m.quick_find__secrets(), '/secrets', KeyRound],
    [m.quick_find__explore(), '/explore', Compass],
    [m.quick_find__overview(), '/overview', LayoutGrid],
    [m.quick_find__design(), '/design', Palette],
    ['Emails', '/emails', Mail],
    [m.quick_find__translations(), '/translations', Globe],
    [m.quick_find__artifacts(), '/artifacts', FileText],
    [m.quick_find__knowledge(), '/knowledge', BookOpen],
    [m.quick_find__front_doors(), '/front-doors', Smartphone],
    [m.quick_find__audit(), '/audit', History],
    [m.code_screen__title(), '/code', FileCode],
    [m.quick_find__publish(), '/publish', Upload],
    [m.quick_find__assistants(), '/assistants', Users],
    [m.quick_find__virtual_users(), '/virtual-users', UserRoundCheck],
    [m.quick_find__routines(), '/routines', Workflow],
    [m.quick_find__versions(), '/versions', History],
    [m.quick_find__building_logs(), '/logs', ScrollText],
    [m.quick_find__how_its_running(), '/performance', Activity],
    [m.quick_find__metrics(), '/metrics', Gauge],
    [m.quick_find__ask_pikku(), '', Bot],
  ] as const
).map(([label, to, Icon]) => ({ key: `page-${to || 'ask'}`, label, hint: to ? '' : m.quick_find__ask_in_your_own_words(), id: to, Icon }))

export function QuickFind({ onClose, onAsk }: { onClose: () => void; onAsk: (text: I18nString) => void }) {
  const go = useNavigate()
  const [q, setQ] = useState('')
  const [at, setAt] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => input.current?.focus(), [])

  const needle = q.trim().toLowerCase()
  const words = needle.split(/\s+/).filter(Boolean)
  const hits = needle ? pages().filter((h) => words.every((w) => `${h.label} ${h.hint}`.toLowerCase().includes(w))) : pages()
  const pick = (h?: Hit) => {
    if (!h) return
    if (h.id) go({ ...keep, to: h.id as never })
    else onAsk(m.explore_hub__what_should_i_look_at_today())
    onClose()
  }
  const key = (e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setAt((i) => Math.min(i + 1, hits.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setAt((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') pick(hits[at])
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-start justify-items-center bg-foreground/30 pt-[14vh]" onPointerDown={onClose}>
      <div role="dialog" aria-modal="true" aria-label={m.quick_find__jump_to_a_page()} className="w-[min(560px,calc(100vw-2rem))] overflow-hidden rounded-[18px] border border-border bg-popover text-popover-foreground shadow-lg" onPointerDown={(e) => e.stopPropagation()} onKeyDown={key}>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-5 shrink-0 text-muted-foreground" />
          <input
            ref={input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setAt(0)
            }}
            placeholder={m.quick_find__jump_to_a_page()}
            aria-label={m.quick_find__jump_to_a_page()}
            className="h-14 min-w-0 flex-1 bg-transparent text-[17px] outline-none placeholder:text-muted-foreground"
          />
          <kbd className="rounded-md border border-border px-1.5 py-0.5 text-[12px] text-muted-foreground">{m.quick_find__esc()}</kbd>
        </div>
        <ul role="listbox" aria-label={m.quick_find__results()} className="m-0 max-h-[50vh] list-none overflow-auto p-1.5">
          {hits.length === 0 ? <li className="px-3 py-6 text-center text-[15px] text-muted-foreground">{m.quick_find__nothing_matches({ q })}</li> : null}
          {hits.map((h, i) => (
            <li key={h.key} role="option" aria-selected={i === at}>
              <button type="button" onClick={() => pick(h)} onMouseEnter={() => setAt(i)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start aria-selected:bg-accent" aria-selected={i === at}>
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-ink-2">
                  <h.Icon className="size-4.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[15px] leading-[1.3]">{asI18n(h.label)}</b>
                  <small className="block truncate text-[13px] leading-[1.3] text-muted-foreground">{asI18n(h.hint)}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
