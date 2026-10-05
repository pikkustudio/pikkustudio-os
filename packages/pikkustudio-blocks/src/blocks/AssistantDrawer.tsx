import { m } from '@/i18n/messages'
import { useContext, useEffect, useRef, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, ArrowRight, Check, CircleAlert, Moon, Wrench, X } from 'lucide-react'
import { Button } from '../ui/button'
import { ProjectChatTransportCtx } from '../lib/chat'
import { GRADE_NOT_QUITE } from '../lib/tokens'


export type Turn = ['visitor' | 'me' | 'did', string]
export type Past = { id: string; who: string; when: string; outcome: string; went: 'good' | 'bad' | 'plain'; turns: Turn[]; grade?: { verdict: 'Good' | 'Not quite'; why: string } }
export type Assistant = {
  id: string
  name: string
  hue: 'teal' | 'petrol' | 'sea'
  icon: LucideIcon
  hello: string
  does: string[]
  handsOff: string[]
  chats: number
  check: string | null
  history: Past[]
}

const iconBtn = 'grid size-11 place-items-center rounded-full text-hero-ink transition-colors hover:bg-white/15'

function Bubble({ turn, hue }: { turn: Turn; hue: Assistant['hue'] }) {
  const [who, text] = turn
  if (who === 'did')
    return (
      <div className="flex items-center gap-2 self-center rounded-full bg-secondary px-3.5 py-1.5 text-[14px] font-semibold text-ink-2">
        <Wrench className="size-4" aria-hidden="true" />
        {text}
      </div>
    )
  return (
    <div data-hue={who === 'me' ? hue : undefined} className={`max-w-[88%] rounded-[20px] px-4 py-2.5 text-[16px] leading-[1.45] ${who === 'me' ? 'self-start rounded-tl-md bg-hero text-hero-ink' : 'self-end rounded-tr-md bg-accent text-foreground'}`}>
      {text}
    </div>
  )
}
export function AssistantDrawer({ a, projectKey, start, onClose, onPikku, onFix }: { a: Assistant; projectKey: string; start: 'chat' | 'history'; onClose: () => void; onPikku: () => void; onFix: (text: string) => void }) {
  const [tab, setTab] = useState(start)
  const [seen, setSeen] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [msgs, setMsgs] = useState<Turn[]>([['me', a.hello.startsWith('Zzz') ? m.assistant_drawer__opening_sleepy() : m.assistant_drawer__opening({ hello: a.hello })]])
  const [thinking, setThinking] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const transport = useContext(ProjectChatTransportCtx)
  const thread = useRef(`try-${Math.random().toString(36).slice(2)}`)
  const past = a.history.find((h) => h.id === seen)

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' })
  }, [msgs, thinking, tab])

  const send = async () => {
    const t = draft.trim()
    if (!t || thinking) return
    setMsgs((m) => [...m, ['visitor', t]])
    setDraft('')
    setThinking(true)
    const add = (turn: Turn) => setMsgs((m) => [...m, turn])
    try {
      let open = -1
      for await (const e of transport(`/p/${projectKey}/rpc/agent/${a.id}/stream`, { message: t, threadId: thread.current, resourceId: 'studio-try' })) {
        if (e.type === 'TOOL_CALL_START') add(['did', String(e.toolCallName ?? m.assistant_drawer__looked_something_up())])
        else if (e.type === 'TEXT_MESSAGE_START') setMsgs((m) => (open = m.length, [...m, ['me', '']]))
        else if (e.type === 'TEXT_MESSAGE_CONTENT') setMsgs((m) => m.map((x, i) => (i === open ? ['me', x[1] + String(e.delta)] : x)))
        else if (e.type === 'RUN_ERROR') add(['did', m.assistant_drawer__something_got_in_the_way()])
      }
    } catch {
      add(['did', m.assistant_drawer__could_not_reach()])
    } finally {
      setMsgs((m) => m.filter((x) => !(x[0] === 'me' && !x[1].trim())))
      setThinking(false)
    }
  }

  const tabBtn = (id: 'chat' | 'history', label: string) => (
    <button type="button" role="tab" aria-selected={tab === id} onClick={() => (setTab(id), setSeen(null))} className={`border-b-[3px] px-4 py-3 text-[16px] font-semibold ${tab === id ? 'border-primary text-accent-foreground' : 'border-transparent text-ink-2'}`}>
      {label}
    </button>
  )

  return (
    <aside role="dialog" aria-label={`Chat with the ${a.name}`} className="fixed inset-y-0 right-0 z-50 flex w-102 max-w-full flex-col border-l border-border bg-card shadow-[0_24px_56px_-14px_rgba(8,40,52,0.45)] @min-[1700px]/app:w-120">
      <header data-hue={a.hue} className="flex items-center gap-3 bg-hero px-5 pt-4 pb-4 text-hero-ink">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-white text-hero-btn-ink" aria-hidden="true">
          {a.chats === 0 ? <Moon className="size-7" /> : <a.icon className="size-7" />}
        </span>
        <span className="min-w-0 flex-1">
          <h2 className="font-heading text-[22px] leading-[1.15] font-bold tracking-[-0.012em]">{a.name}</h2>
          <small className="block text-[14px] text-hero-ink-2">{a.check ? `Quality check: ${a.check}` : m.assistant_drawer__no_quality_check_yet()}</small>
        </span>
        <button type="button" aria-label={m.assistant_drawer__close()} onClick={onClose} className={iconBtn}>
          <X className="size-5.5" />
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-secondary px-5 py-3 text-[14px] text-ink-2">
        <span className="min-w-0 flex-1 basis-56">
          <b className="text-foreground">{m.assistant_drawer__you_are_talking_to({ name: a.name })}</b>  {m.assistant_drawer__pretend_you_are_a()}
        </span>
        <Button variant="bordered" size="compact" onClick={onPikku}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          
          {m.assistant_drawer__back_to_pikku()}
        </Button>
      </div>

      <div className="flex gap-1 border-b border-border px-3" role="tablist">
        {tabBtn('chat', 'Chat')}
        {tabBtn('history', `History (${a.history.length})`)}
      </div>

      {tab === 'chat' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-5 py-5" role="log" aria-label={`Chat with the ${a.name}`} tabIndex={0}>
            {msgs.map((t, i) => (
              <Bubble key={i} turn={t} hue={a.hue} />
            ))}
            {thinking && <div className="self-start text-[15px] text-muted-foreground">{m.assistant_drawer__is_thinking({ name: a.name })}</div>}
            <div ref={end} />
          </div>
          <form
            className="flex items-end gap-2 border-t border-border px-5 pt-3.5 pb-4.5"
            onSubmit={(e) => {
              e.preventDefault()
              send()
            }}
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label={`Message the ${a.name}`}
              placeholder={m.assistant_drawer__write_as_a_visitor()}
              className="min-h-12 flex-1 rounded-full border-[1.5px] border-input bg-background px-4.5 text-[16px] text-foreground focus:border-primary focus:ring-4 focus:ring-accent focus:outline-none"
            />
            <button type="submit" aria-label={m.assistant_drawer__send()} disabled={!draft.trim() || thinking} className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">
              <ArrowRight className="size-5.5" />
            </button>
          </form>
        </div>
      ) : past ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-border px-5 py-3">
            <Button variant="bordered" size="compact" onClick={() => setSeen(null)}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              
              {m.assistant_drawer__all_chats()}
            </Button>
            <small className="text-[14px] text-ink-2">
              {past.who} · {past.when}
            </small>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-5 py-5" role="log" aria-label={m.assistant_drawer__past_chat()} tabIndex={0}>
            {past.turns.map((t, i) => (
              <Bubble key={i} turn={t} hue={a.hue} />
            ))}
            {past.grade && (
              <div className={`flex items-start gap-2.5 rounded-[16px] px-4 py-3 text-[15px] ${past.grade.verdict === 'Good' ? 'bg-secondary text-ink-2' : 'bg-warning text-warning-foreground'}`}>
                {past.grade.verdict === 'Good' ? <Check className="mt-0.5 size-5 shrink-0" aria-hidden="true" /> : <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden="true" />}
                <span>
                  <b>{m.assistant_drawer__quality_check({ verdict: past.grade.verdict.toLowerCase() })}</b> {past.grade.why}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-3 border-t border-border px-5 py-4">
            <Button variant="bordered" size="compact" onClick={() => onFix(`The ${a.name} got this wrong in its chat with ${past.who} (${past.when}). Please look at it and fix it.`)}>
              
              {m.assistant_drawer__it_got_this_wrong()}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-auto" role="tabpanel">
          {a.history.length === 0 ? (
            <p className="px-6 py-8 text-[16px] text-ink-2">{m.assistant_drawer__no_chats_yet({ name: a.name })}</p>
          ) : (
            <ul className="divide-y divide-border">
              {a.history.map((h) => (
                <li key={h.id}>
                  <button type="button" onClick={() => setSeen(h.id)} className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-secondary/60">
                    <span className={`mt-1.5 size-3 shrink-0 rounded-full ${h.went === 'good' ? 'bg-success' : h.went === 'bad' ? 'bg-warning' : 'bg-muted-foreground'}`} aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <b className="block text-[16px] leading-[1.3]">{h.who}</b>
                      <small className="block text-[14px] text-ink-2">{h.outcome}</small>
                      <small className="block text-[13px] text-muted-foreground">{h.when}</small>
                    </span>
                    {h.grade?.verdict === GRADE_NOT_QUITE && <span className="shrink-0 rounded-full bg-warning px-2.5 py-0.5 text-[12px] font-bold text-warning-foreground">{m.assistant_drawer__check_this_one()}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  )
}
