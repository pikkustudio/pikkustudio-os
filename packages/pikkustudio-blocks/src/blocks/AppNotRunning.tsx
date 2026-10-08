import { useState } from 'react'
import { ChevronDown, LoaderCircle, Play, RefreshCw } from 'lucide-react'
import { m } from '@/i18n/messages'
import { Button } from '../ui/button'
import { StateScreen } from './StateScreen'

export type AppNotRunningState = 'off' | 'starting' | 'failed'

function Art({ state }: { state: AppNotRunningState }) {
  const soft = 'motion-safe:animate-pulse'
  return (
    <>
      <circle cx="240" cy="30" r="110" className="fill-w1" />
      <circle cx="40" cy="185" r="95" className="fill-w2" />
      <circle cx="274" cy="172" r="8" className="fill-coral" />
      <rect x="62" y="48" width="176" height="108" rx="12" className="fill-w6" opacity="0.92" />
      <circle cx="78" cy="63" r="4" className="fill-w2" />
      <circle cx="92" cy="63" r="4" className="fill-w2" />
      <circle cx="106" cy="63" r="4" className="fill-w2" />
      <rect x="72" y="76" width="156" height="70" rx="8" className="fill-w2" />
      {state === 'off' && (
        <>
          <circle cx="150" cy="112" r="16" fill="none" className="stroke-w6" strokeWidth="3" strokeDasharray="70 32" strokeDashoffset="-17" strokeLinecap="round" />
          <path d="M150 94v14" className="stroke-w6" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {state === 'starting' && (
        <>
          <rect x="84" y="88" width="70" height="9" rx="4.5" className={`fill-w3 ${soft}`} />
          <rect x="84" y="104" width="130" height="7" rx="3.5" className={`fill-w3 ${soft}`} style={{ animationDelay: '0.25s' }} />
          <rect x="84" y="118" width="104" height="7" rx="3.5" className={`fill-w3 ${soft}`} style={{ animationDelay: '0.5s' }} />
          <rect x="84" y="134" width="132" height="6" rx="3" className="fill-w1" />
          <rect x="84" y="134" width="52" height="6" rx="3" className={`fill-w5 ${soft}`} />
        </>
      )}
      {state === 'failed' && (
        <>
          <rect x="84" y="88" width="70" height="9" rx="4.5" className="fill-w3" />
          <rect x="84" y="104" width="52" height="7" rx="3.5" className="fill-w3" />
          <rect x="84" y="118" width="130" height="22" rx="7" fill="none" className="stroke-w6" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" />
        </>
      )}
    </>
  )
}

export function AppNotRunning({
  state,
  name,
  what,
  onStart,
  starting = false,
}: {
  state: AppNotRunningState
  name?: string
  what?: string
  onStart: () => void
  starting?: boolean
}) {
  const [explain, setExplain] = useState(false)
  const who = name ?? m.app_not_running__your_app()
  const thing = what ?? m.app_not_running__what_default()
  const busy = state === 'starting' || starting

  const title =
    state === 'failed' ? m.app_not_running__failed_title({ name: who }) : busy ? m.app_not_running__starting_title({ name: who }) : m.app_not_running__off_title({ name: who })
  const text =
    state === 'failed' && explain
      ? m.app_not_running__failed_explain({ name: who })
      : state === 'failed'
        ? m.app_not_running__failed_text()
        : busy
          ? m.app_not_running__starting_text({ what: thing })
          : m.app_not_running__off_text({ what: thing })

  return (
    <StateScreen label={title} hue={state === 'failed' ? 'petrol' : 'teal'} art={<Art state={state} />} title={title} why={text}>
      <div role="status" aria-live="polite" className="sr-only">{title}</div>
      <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button variant="hero" size="page" type="button" disabled={busy} aria-busy={busy} onClick={onStart}>
          {busy ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : state === 'failed' ? <RefreshCw className="size-5" aria-hidden="true" /> : <Play className="size-5" aria-hidden="true" />}
          {busy ? m.app_not_running__starting_button() : state === 'failed' ? m.app_not_running__try_again() : m.app_not_running__start()}
        </Button>
        {state === 'failed' ? (
          <button type="button" aria-expanded={explain} onClick={() => setExplain((v) => !v)} className="inline-flex items-center gap-1.5 text-px15 font-semibold text-hero-ink underline-offset-2 hover:underline">
            <ChevronDown className={`size-4 transition-transform ${explain ? 'rotate-180' : ''}`} aria-hidden="true" />
            {explain ? m.app_not_running__hide() : m.app_not_running__what_happened()}
          </button>
        ) : null}
      </div>
    </StateScreen>
  )
}
