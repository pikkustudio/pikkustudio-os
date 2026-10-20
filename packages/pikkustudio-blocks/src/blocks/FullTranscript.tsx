import { asI18n, type I18nNode } from '@pikku/react'
import { useState } from 'react'
import { Brain, Check, ChevronDown, CircleAlert, Wrench } from 'lucide-react'
import { m } from '@/i18n/messages'
import { NO_AI, stripMarkers } from '../lib/builder-chat'
import { NoAiCard } from './NoAiCard'
import { ErrorFixNote } from './ErrorFixNote'
import { errorFixOf } from '../lib/error-fix'
import { ChatMarkdown } from './ChatMarkdown'

export type FullItem = {
  kind: string
  at: number
  text?: string
  id?: string
  name?: string
  summary?: string
  args?: string
  output?: string
  status?: string
}

const block = 'min-w-0 rounded-xl border border-border bg-secondary text-[14px] text-ink-2'
const head = 'flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2 text-start focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none'
const body = 'max-h-72 overflow-auto border-t border-border px-3 py-2.5 text-[13px] leading-[1.55] break-words whitespace-pre-wrap'

function Fold({ icon, label, summary, live, children }: { icon: I18nNode; label: I18nNode; summary?: string; live: boolean; children: I18nNode }) {
  const [chosen, setChosen] = useState<boolean | null>(null)
  const open = chosen ?? live
  return (
    <div className={block} data-testid="full-block">
      <button type="button" className={head} aria-expanded={open} onClick={() => setChosen(!open)}>
        <span className="shrink-0 text-muted-foreground">{icon}</span>
        <span className="shrink-0 font-semibold">{label}</span>
        {!open && summary ? <span className="min-w-0 flex-1 truncate text-muted-foreground">{asI18n(summary)}</span> : <span className="flex-1" />}
        <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open ? children : null}
    </div>
  )
}

const oneLine = (text: string) => text.replace(/\s+/g, ' ').trim()

export function FullTranscript({ items, busy, avatar }: { items: FullItem[]; busy: boolean; avatar: I18nNode }) {
  const lastNoAi = items.reduce((found, it, index) => (it.kind === 'error' && NO_AI.test(it.text ?? '') ? index : found), -1)
  if (!items.length) return <p className="text-[14px] text-muted-foreground">{m.builder_chat__full_empty()}</p>
  return (
    <>
      {items.map((it, index) => {
        const noAi = it.kind === 'error' && NO_AI.test(it.text ?? '')
        const live = busy && index === items.length - 1
        const key = `${it.kind}${index}`
        if (it.kind === 'user')
          return (
            <div key={key} className="flex min-w-0 items-start justify-end gap-3">
              <div className="flex max-w-5/6 min-w-0 flex-col gap-2 rounded-t-[18px] rounded-es-[18px] rounded-ee-[4px] bg-accent px-4 py-2.5 text-[16px] leading-[1.5] break-words whitespace-pre-wrap text-foreground">{asI18n(it.text ?? '')}</div>
            </div>
          )
        if (it.kind === 'assistant')
          return (
            <div key={key} className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5">{avatar}</span>
              <div className="flex min-w-0 flex-col gap-2 text-[16px] leading-[1.5] text-foreground">
                <ChatMarkdown>{stripMarkers(it.text ?? '')}</ChatMarkdown>
              </div>
            </div>
          )
        if (it.kind === 'thinking')
          return (
            <Fold key={key} live={live} icon={<Brain className="size-4" aria-hidden="true" />} label={m.builder_chat__thinking()} summary={oneLine(it.text ?? '')}>
              <div className={`${body} italic`}>{asI18n(it.text ?? '')}</div>
            </Fold>
          )
        if (it.kind === 'tool') {
          const running = it.status === 'running'
          const failed = it.status === 'error'
          return (
            <Fold
              key={key}
              live={false}
              icon={failed ? <CircleAlert className="size-4 text-warning-foreground" aria-hidden="true" /> : running ? <Wrench className="size-4" aria-hidden="true" /> : <Check className="size-4" aria-hidden="true" />}
              label={asI18n(it.name ?? '')}
              summary={it.summary || (running ? undefined : failed ? m.builder_chat__step_failed() : m.builder_chat__step_done())}
            >
              <div className="border-t border-border">
                {it.args ? (
                  <>
                    <p className="px-3 pt-2 text-[12px] font-semibold text-muted-foreground">{m.builder_chat__tool_input()}</p>
                    <pre className="max-h-72 overflow-auto px-3 pb-2.5 font-mono text-[12px] leading-snug break-words whitespace-pre-wrap">{it.args}</pre>
                  </>
                ) : null}
                <p className="border-t border-border px-3 pt-2 text-[12px] font-semibold text-muted-foreground">{m.builder_chat__tool_output()}</p>
                <pre className="max-h-72 overflow-auto px-3 pb-2.5 font-mono text-[12px] leading-snug break-words whitespace-pre-wrap">{running ? m.builder_chat__tool_working() : asI18n(it.output ?? '')}</pre>
              </div>
            </Fold>
          )
        }
        if (noAi) return index === lastNoAi ? <NoAiCard key={key} /> : null
        const fix = it.kind === 'error' ? errorFixOf(it.text) : null
        if (fix)
          return (
            <Fold key={key} live icon={<CircleAlert className="size-4 text-warning-foreground" aria-hidden="true" />} label={m.builder_chat__error()} summary={oneLine(fix.text)}>
              <div className={body}>
                <ErrorFixNote fix={fix} />
              </div>
            </Fold>
          )
        if (it.kind === 'error')
          return (
            <Fold key={key} live icon={<CircleAlert className="size-4 text-warning-foreground" aria-hidden="true" />} label={m.builder_chat__error()} summary={oneLine(it.text ?? '')}>
              <div className={body}>{asI18n(it.text ?? '')}</div>
            </Fold>
          )
        return it.text || it.summary || it.name ? (
          <Fold key={key} live={false} icon={<Wrench className="size-4" aria-hidden="true" />} label={asI18n(it.kind)} summary={oneLine(it.text ?? it.name ?? '')}>
            <div className={body}>{asI18n(it.text ?? JSON.stringify(it, null, 2))}</div>
          </Fold>
        ) : null
      })}
    </>
  )
}
