import { asI18n } from '@pikku/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Check, ExternalLink, KeyRound, LogIn, Sparkles } from 'lucide-react'
import { usePikkuMutation } from '@project/functions-sdk/pikku/api.gen'
import { m } from '@/i18n/messages'
import { Button } from '../ui/button'
import { Spinner } from './Spinner'
import { LOCAL_TEAM, useTeamSlug } from '../lib/team'

type Code = { code: string; url: string; expiresAt: string }
type Step = { kind: 'idle' } | { kind: 'starting' } | { kind: 'code'; code: Code } | { kind: 'done' } | { kind: 'failed'; why: 'expired' | 'rejected' | 'unreachable' }

const POLL_MS = 2000
/** The approval page with the code filled in, and the project's team picked; a local project leaves it to pick the personal team. */
const approveUrl = (code: Code, team: string) => {
  const query = new URLSearchParams({ code: code.code })
  if (team && team !== LOCAL_TEAM) query.set('team', team)
  return `${code.url}?${query}`
}

/**
 * Shown in place of a failed build when the builder has no AI. Signs in to Pikku Studio Cloud right here:
 * a device code, approved in a tab we open with the code filled in, polled until confirmed.
 * A key of your own goes through Choose your AI, which brings the owner back to this chat when done.
 */
export function NoAiCard({ onRetry }: { onRetry?: () => void }) {
  const navigate = useNavigate()
  const here = useLocation({ select: (l) => l.href })
  const client = useQueryClient()
  const start = usePikkuMutation('studio:startSignIn' as never) as unknown as { mutateAsync: (input: object) => Promise<Code> }
  const poll = usePikkuMutation('studio:pollSignIn' as never) as unknown as { mutateAsync: (input: { code: string }) => Promise<{ status: string }> }
  const team = useTeamSlug()
  const [step, setStep] = useState<Step>({ kind: 'idle' })
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const stop = () => clearInterval(timer.current)
  useEffect(() => stop, [])

  const signIn = async () => {
    stop()
    // Opened inside the click so the browser doesn't block it; pointed at the approval page once the code is in.
    const tab = window.open('', '_blank')
    setStep({ kind: 'starting' })
    let code: Code
    try {
      code = await start.mutateAsync({})
    } catch {
      tab?.close()
      setStep({ kind: 'failed', why: 'unreachable' })
      return
    }
    if (tab) {
      tab.opener = null
      tab.location.href = approveUrl(code, team)
    }
    setStep({ kind: 'code', code })
    timer.current = setInterval(async () => {
      const { status } = await poll.mutateAsync({ code: code.code }).catch(() => ({ status: 'pending' }))
      if (status === 'confirmed') {
        stop()
        setStep({ kind: 'done' })
        await client.invalidateQueries()
      } else if (status === 'expired' || status === 'rejected') {
        stop()
        setStep({ kind: 'failed', why: status })
      }
    }, POLL_MS)
  }
  const cancel = () => {
    stop()
    setStep({ kind: 'idle' })
  }
  const ownKey = () => navigate({ to: '/choose-ai', hash: 'alts', search: { redirect: here } as never })

  return (
    <article className="flex flex-col gap-3 rounded-card border-[1.5px] border-border bg-card p-4.5 shadow-card" data-testid="no-ai-card" aria-live="polite">
      <div className="flex items-center gap-2.5">
        <span className="grid size-9.5 shrink-0 place-items-center rounded-lg bg-accent text-primary">
          {step.kind === 'done' ? <Check className="size-5.25" aria-hidden="true" /> : <Sparkles className="size-5.25" aria-hidden="true" />}
        </span>
        <h3 className="font-sans text-[18px] leading-[1.3] font-bold tracking-normal text-balance">
          {step.kind === 'done' ? m.no_ai_card__done_title() : step.kind === 'code' ? m.no_ai_card__code_title() : m.no_ai_card__title()}
        </h3>
      </div>

      {step.kind === 'code' ? (
        <>
          <p className="text-[15px] leading-[1.5] text-ink-2">{m.no_ai_card__code_text()}</p>
          <p dir="ltr" className="self-start rounded-xl bg-secondary px-4 py-2 font-mono text-[26px] leading-none font-bold tracking-[0.14em]" data-testid="no-ai-card__code">
            {asI18n(step.code.code)}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="flex items-center gap-2 text-[14px] font-semibold text-ink-2">
              <Spinner />
              {m.no_ai_card__waiting()}
            </span>
            <a className="flex items-center gap-1 text-[14px] underline" href={approveUrl(step.code, team)} target="_blank" rel="noreferrer">
              {m.no_ai_card__open_tab()}
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
            <button type="button" className="cursor-pointer text-[14px] text-muted-foreground underline" onClick={cancel}>
              {m.no_ai_card__cancel()}
            </button>
          </div>
        </>
      ) : step.kind === 'done' ? (
        <>
          <p className="text-[15px] leading-[1.5] text-ink-2">{m.no_ai_card__done_text()}</p>
          {onRetry ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="default" size="compact" type="button" onClick={onRetry}>
                {m.no_ai_card__resend()}
              </Button>
            </div>
          ) : null}
        </>
      ) : (
        <>
          <p className="text-[15px] leading-[1.5] text-ink-2" role={step.kind === 'failed' ? 'alert' : undefined}>
            {step.kind === 'failed'
              ? step.why === 'expired'
                ? m.no_ai_card__expired()
                : step.why === 'rejected'
                  ? m.no_ai_card__rejected()
                  : m.no_ai_card__unreachable()
              : m.no_ai_card__text()}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="default" size="compact" type="button" disabled={step.kind === 'starting'} onClick={signIn}>
              {step.kind === 'starting' ? <Spinner /> : <LogIn className="size-4" aria-hidden="true" />}
              {step.kind === 'failed' ? m.no_ai_card__new_code() : m.no_ai_card__sign_in()}
            </Button>
            <Button variant="bordered" size="compact" type="button" onClick={ownKey}>
              <KeyRound className="size-4" aria-hidden="true" />
              {m.no_ai_card__own_key()}
            </Button>
          </div>
        </>
      )}
    </article>
  )
}
