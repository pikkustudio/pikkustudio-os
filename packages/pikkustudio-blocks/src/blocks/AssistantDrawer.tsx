import { AssistantLiveChat } from './AssistantLiveChat'
import { m } from '@/i18n/messages'
import { asI18n, sep, type I18nString } from '@pikku/react'
import { useContext, useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeft, Check, CircleAlert, KeyRound, Moon, Trash2, Wrench, X } from 'lucide-react'
import { Button } from '../ui/button'
import { ProjectAgentApiCtx } from '../lib/chat'
import { useProjectAction, useProjectQuery } from '../lib/projectRpc'
import { InlineAlert } from './InlineAlert'
import { GRADE_NOT_QUITE } from '../lib/tokens'


export type Turn = ['visitor' | 'me' | 'did', I18nString]
export type Past = { id: string; who: I18nString; when: I18nString; outcome: I18nString; went: 'good' | 'bad' | 'plain'; turns: Turn[]; grade?: { verdict: 'Good' | 'Not quite'; why: I18nString } }
export type Assistant = {
  id: string
  name: I18nString
  hue: 'teal' | 'petrol' | 'sea'
  icon: LucideIcon
  hello: I18nString
  does: I18nString[]
  handsOff: I18nString[]
  thinks: I18nString | null
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
    <div data-hue={who === 'me' ? hue : undefined} className={`max-w-[88%] rounded-[20px] px-4 py-2.5 text-[16px] leading-[1.45] ${who === 'me' ? 'self-start rounded-ss-md bg-hero text-hero-ink' : 'self-end rounded-se-md bg-accent text-foreground'}`}>
      {text}
    </div>
  )
}
type Needed = { requirements: { credentialName: string; displayName: string; connected: boolean }[]; allConnected: boolean }

export function AssistantDrawer({ a, projectKey, start, onClose, onPikku, onFix }: { a: Assistant; projectKey: string; start: 'chat' | 'history'; onClose: () => void; onPikku: () => void; onFix: (text: I18nString) => void }) {
  const [tab, setTab] = useState(start)
  const [seen, setSeen] = useState<string | null>(null)
  const [asking, setAsking] = useState(false)
  const remove = useProjectAction<{ threadId: string }>(projectKey, 'console:deleteAgentThread', ['assistants'])
  const api = useContext(ProjectAgentApiCtx)(projectKey)
  const needed = useProjectQuery<Needed>(projectKey, 'console:agentCredentialCheck', { agentName: a.id })
  const missing = needed.data && !needed.data.allConnected ? needed.data.requirements.filter((r) => !r.connected) : []
  const past = a.history.find((h) => h.id === seen)

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const connect = (name: string) => {
    const popup = window.open(`${api.replace(/\/rpc\/agent$/, '')}/credentials/${name}/connect`, 'oauth-connect', 'width=600,height=700')
    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer)
        void needed.refetch()
      }
    }, 500)
  }

  const tabBtn = (id: 'chat' | 'history', label: I18nString) => (
    <button type="button" role="tab" aria-selected={tab === id} onClick={() => (setTab(id), setSeen(null), setAsking(false), remove.reset())} className={`border-b-[3px] px-4 py-3 text-[16px] font-semibold ${tab === id ? 'border-primary text-accent-foreground' : 'border-transparent text-ink-2'}`}>
      {label}
    </button>
  )

  return (
    <aside role="dialog" aria-label={m.assistant_drawer__chat_label({ name: a.name })} className="fixed inset-y-0 end-0 z-50 flex w-102 max-w-full flex-col border-s border-border bg-card shadow-[0_24px_56px_-14px_rgba(8,40,52,0.45)] @min-[1700px]/app:w-120">
      <header data-hue={a.hue} className="flex items-center gap-3 bg-hero px-5 pt-4 pb-4 text-hero-ink">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-white text-hero-btn-ink" aria-hidden="true">
          {a.chats === 0 ? <Moon className="size-7" /> : <a.icon className="size-7" />}
        </span>
        <span className="min-w-0 flex-1">
          <h2 className="font-heading text-[22px] leading-[1.15] font-bold tracking-[-0.012em]">{a.name}</h2>
          <small className="block text-[14px] text-hero-ink-2">{a.check ? m.assistant_drawer__quality_check_line({ check: a.check }) : m.assistant_drawer__no_quality_check_yet()}</small>
        </span>
        <button type="button" aria-label={m.assistant_drawer__close()} onClick={onClose} className={iconBtn}>
          <X className="size-5.5" />
        </button>
      </header>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-secondary px-5 py-3 text-[14px] text-ink-2">
        <span className="min-w-0 flex-1 basis-56">
          <b className="text-foreground">{m.assistant_drawer__you_are_talking_to({ name: a.name })}</b>{sep(' ')}{m.assistant_drawer__pretend_you_are_a()}
        </span>
        <Button variant="bordered" size="compact" onClick={onPikku}>
          <ArrowLeft className="rtl:-scale-x-100 size-4" aria-hidden="true" />
          
          {m.assistant_drawer__back_to_pikku()}
        </Button>
      </div>

      <div className="flex gap-1 border-b border-border px-3" role="tablist">
        {tabBtn('chat', m.assistant_drawer__tab_chat())}
        {tabBtn('history', m.assistant_drawer__tab_history({ n: a.history.length }))}
      </div>

      {tab === 'chat' && missing.length > 0 ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-auto px-6 py-8 text-center" data-testid="connect-gate">
          <KeyRound className="size-8 text-warning-foreground" aria-hidden="true" />
          <b className="font-heading text-[20px]">{m.assistant_drawer__connect_title({ name: a.name })}</b>
          <p className="max-w-ch40 text-[15px] text-ink-2">{m.assistant_drawer__connect_text()}</p>
          <div className="flex flex-col gap-2">
            {missing.map((r) => (
              <Button key={r.credentialName} type="button" variant="bordered" size="compact" onClick={() => connect(r.credentialName)}>
                {m.assistant_drawer__connect_one({ name: asI18n(r.displayName) })}
              </Button>
            ))}
          </div>
        </div>
      ) : tab === 'chat' ? (
        <AssistantLiveChat key={a.id} agentId={a.id} name={a.name} hue={a.hue} hello={a.hello} projectKey={projectKey} onFix={onFix} />
      ) : past ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-border px-5 py-3">
            <Button variant="bordered" size="compact" onClick={() => (setSeen(null), setAsking(false), remove.reset())}>
              <ArrowLeft className="rtl:-scale-x-100 size-4" aria-hidden="true" />
              
              {m.assistant_drawer__all_chats()}
            </Button>
            <small className="text-[14px] text-ink-2">
              {past.who}{sep(' · ')}{past.when}
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
                  <b>{m.assistant_drawer__quality_check({ verdict: past.grade.verdict.toLowerCase() })}</b>{sep(' ')}{past.grade.why}
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 border-t border-border px-5 py-4">
            {remove.isError ? <InlineAlert title={m.assistant_drawer__delete_failed()} body={m.assistant_drawer__delete_failed_body()} /> : null}
            {asking ? (
              <div className="flex flex-col gap-3">
                <p className="text-[15px] text-foreground">{m.assistant_drawer__delete_confirm()}</p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="destructive"
                    size="compact"
                    aria-busy={remove.isPending}
                    onClick={() => remove.mutate({ threadId: past.id }, { onSuccess: () => (setSeen(null), setAsking(false)) })}
                  >
                    {m.assistant_drawer__delete_yes()}
                  </Button>
                  <Button variant="ghost" size="compact" onClick={() => (setAsking(false), remove.reset())}>
                    {m.assistant_drawer__keep_it()}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <Button variant="bordered" size="compact" onClick={() => onFix(m.assistant_drawer__fix_prompt({ name: a.name, who: past.who, when: past.when }))}>
                  {m.assistant_drawer__it_got_this_wrong()}
                </Button>
                <Button variant="ghost" size="compact" onClick={() => setAsking(true)}>
                  <Trash2 className="size-4" aria-hidden="true" />
                  {m.assistant_drawer__delete_chat()}
                </Button>
              </div>
            )}
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
                  <button type="button" onClick={() => setSeen(h.id)} className="flex w-full items-start gap-3 px-5 py-4 text-start hover:bg-secondary/60">
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
