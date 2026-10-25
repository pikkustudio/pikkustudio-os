import { m } from '@/i18n/messages'
import { asI18n } from '@pikku/react'
import { ArrowRight, MessageCircleQuestion } from 'lucide-react'
import { useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { ASK_TONE } from '../lib/ask-tone'
import type { QuestionNote } from '../lib/shell'

/** The project guide's open question, on the page itself: pick an answer, write your own, or skip it. */
export function QuestionCard({ question }: { question: QuestionNote }) {
  const [own, setOwn] = useState('')
  const tone = ASK_TONE[question.tone]
  const submit = () => {
    const text = own.trim()
    if (!text || question.busy) return
    setOwn('')
    question.answer(asI18n(text))
  }
  return (
    <article className={`flex flex-col gap-4 rounded-card border-[1.5px] bg-card p-5 shadow-card ${tone.box}`} data-testid="question-card">
      <div className="flex items-center gap-2.5">
        <span className={`grid size-9.5 shrink-0 place-items-center rounded-lg ${tone.ic}`}>
          <MessageCircleQuestion className="size-5.25" />
        </span>
        <span className={`text-[14px] font-bold ${tone.label}`}>{tone.title()}</span>
      </div>
      <h2 className="font-sans text-[20px] leading-[1.3] font-bold tracking-normal text-balance">{question.question}</h2>
      {question.options.length ? (
        <ul className="flex flex-col gap-2" data-testid="question-options">
          {question.options.map((option, n) => (
            <li key={option}>
              <button
                type="button"
                disabled={question.busy}
                onClick={() => question.answer(option)}
                className={`group flex w-full cursor-pointer items-center gap-3 rounded-xl border-[1.5px] border-input px-3.5 py-3 text-start text-[15px] leading-[1.4] text-foreground transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60 ${tone.hover}`}
              >
                <span className={`grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-[13px] font-semibold text-ink-2 ${tone.badge}`}>{n + 1}</span>
                <span className="min-w-0 flex-1 text-pretty">{option}</span>
                <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 rtl:-scale-x-100" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <Input
          shape="field"
          value={own}
          disabled={question.busy}
          onChange={(e) => setOwn(e.target.value)}
          aria-label={m.project_flow__answer_label()}
          placeholder={m.project_flow__answer_placeholder()}
          data-testid="question-own"
        />
        <Button type="submit" variant="default" size="compact" disabled={question.busy || !own.trim()} data-testid="question-send">
          {m.project_flow__answer_send()}
        </Button>
      </form>
      <div>
        <Button variant="ghost" size="compactTight" type="button" disabled={question.busy} onClick={question.skip} data-testid="question-skip">
          {m.project_flow__skip_question()}
        </Button>
      </div>
    </article>
  )
}
