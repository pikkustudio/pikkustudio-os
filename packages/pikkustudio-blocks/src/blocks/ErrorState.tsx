import { useContext, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Check, ChevronDown, Copy, Flag, ScrollText, TriangleAlert } from 'lucide-react'
import { m } from '@/i18n/messages'
import { keep } from '../lib/links'
import { ShellCtx } from '../lib/shell'
import { Button } from '../ui/button'
import { PikkuDot } from './PikkuDot'

type Fault = { name?: string; message?: string; errorId?: string; status?: number }

const OURS = /^(Unprocessable|InternalServer|NotFound|BadGateway|ServiceUnavailable|GatewayTimeout)/

export const faultOf = (error: unknown): Fault => {
  const e = (error ?? {}) as Fault
  return { name: e.name, message: e.message, errorId: e.errorId, status: e.status }
}

export const isPikkuFault = (f: Fault) => OURS.test(f.name ?? '') || (f.status ?? 0) >= 500 || /PKU\d+/.test(f.message ?? '')

export const detailsOf = (f: Fault, what?: string) =>
  [what ? `Where: ${what}` : '', `What: ${f.name ?? 'Error'}`, `It said: ${f.message ?? 'nothing'}`, f.errorId ? `Error id: ${f.errorId}` : '', `When: ${new Date().toISOString()}`]
    .filter(Boolean)
    .join('\n')

const reportUrl = (details: string) =>
  `https://github.com/pikkujs/pikku/issues/new?${new URLSearchParams({ title: 'Studio error report', body: `Reported from Pikku Studio.\n\n\`\`\`\n${details}\n\`\`\`\n` })}`

export function ErrorState({ error, what, onRetry, retrying }: { error: unknown; what?: string; onRetry?: () => void; retrying?: boolean }) {
  const { say } = useContext(ShellCtx)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const fault = faultOf(error)
  const details = detailsOf(fault, what)
  const ours = isPikkuFault(fault)
  return (
    <div role="alert" className="relative overflow-hidden rounded-[22px] border-[1.5px] border-destructive/60 bg-card p-7" data-testid="error-state">
      <div className="pointer-events-none absolute -top-16 -right-16 size-56 rounded-full bg-destructive/10" aria-hidden="true" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start">
        <span className="grid size-16 shrink-0 place-items-center rounded-card bg-destructive/12 text-destructive">
          <TriangleAlert className="size-8" />
        </span>
        <div className="min-w-0 flex-1">
          <b className="mb-1 block font-heading text-[22px] text-foreground">{m.query_state__that_did_not_load()}</b>
          <p className="max-w-ch56 text-[16px] text-ink-2 text-pretty">
            {ours ? 'Something went wrong inside Pikku, not in your project. Nothing was changed.' : m.query_state__something_went_wrong_on()}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {onRetry ? (
              <Button variant="bordered" size="page" type="button" onClick={onRetry} disabled={retrying}>
                {m.query_state__try_again()}
              </Button>
            ) : null}
            <Button variant="default" size="page" type="button" onClick={() => say(`Something did not load${what ? ` (${what})` : ''}. Please find out why and file a change request to fix it. Say "change request" in your reply, then tell me in plain words what you changed.\n\n${details}`)}>
              <PikkuDot />
              Fix this for me
            </Button>
            <Button variant="bordered" size="page" type="button" asChild>
              <Link {...keep} to="/logs">
                <ScrollText className="size-4.5" />
                Error logs
              </Link>
            </Button>
            {ours ? (
              <Button variant="bordered" size="page" type="button" asChild>
                <a href={reportUrl(details)} target="_blank" rel="noreferrer">
                  <Flag className="size-4.5" />
                  Report to the Pikku team
                </a>
              </Button>
            ) : null}
          </div>
          <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="mt-4 inline-flex items-center gap-1.5 text-px15 font-semibold text-muted-foreground hover:text-foreground">
            <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
            {open ? 'Hide the details' : 'Show the details'}
          </button>
          {open ? (
            <div className="mt-3 rounded-xl bg-secondary p-4">
              <pre className="m-0 max-h-48 overflow-auto font-mono text-px13 whitespace-pre-wrap text-ink-2" data-testid="error-details">{details}</pre>
              <Button
                variant="bordered"
                size="compact"
                type="button"
                className="mt-3"
                onClick={() => void navigator.clipboard?.writeText(details).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? 'Copied' : 'Copy the details'}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
