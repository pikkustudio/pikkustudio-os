import { Loader2, Mic, Square } from 'lucide-react'
import { m } from '@/i18n/messages'
import { useDictation } from '../lib/useDictation'

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export function MicButton({ onText }: { onText: (text: string) => void }) {
  const d = useDictation(onText)
  const recording = d.state === 'recording'
  const busy = d.state === 'transcribing'
  const label = recording ? m.composer_tools__mic_stop() : m.composer_tools__mic_start()
  return (
    <>
      <button
        type="button"
        aria-label={label}
        aria-pressed={recording}
        title={label}
        disabled={busy}
        onClick={() => (recording ? d.stop() : void d.start())}
        className={`relative grid size-9 shrink-0 place-items-center rounded-full transition-colors duration-140 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:cursor-wait ${recording ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}
        data-testid="mic-button"
        data-state={d.state}
      >
        {recording ? <span className="absolute inset-0 rounded-full bg-destructive/20 motion-reduce:hidden" style={{ transform: `scale(${1 + d.level * 0.35})`, opacity: 0.3 + d.level * 0.7, transition: 'transform 80ms linear' }} aria-hidden="true" /> : null}
        {busy ? <Loader2 className="relative size-4.5 animate-spin" /> : recording ? <Square className="relative size-4 fill-current" /> : <Mic className="relative size-4.5" />}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {recording ? m.composer_tools__mic_listening() : busy ? m.composer_tools__mic_writing() : ''}
      </span>
      {recording ? (
        <span className="flex items-center gap-2 text-[13px] text-destructive" data-testid="mic-timer">
          <span className="tabular-nums" dir="ltr">{clock(d.seconds)}</span>
          {m.composer_tools__mic_listening()}
        </span>
      ) : null}
      {busy ? <span className="text-[13px] text-muted-foreground">{m.composer_tools__mic_writing()}</span> : null}
      {d.state === 'error' && d.error ? (
        <span role="alert" className="flex min-w-0 flex-wrap items-center gap-x-2 text-[13px] text-destructive" data-testid="mic-error">
          <span className="min-w-0 text-pretty">{d.error}</span>
          <button type="button" onClick={d.retry} className="font-bold underline underline-offset-2 hover:no-underline focus-visible:outline-2">{m.composer_tools__try_again()}</button>
          <button type="button" onClick={d.dismiss} className="text-muted-foreground underline underline-offset-2 hover:no-underline focus-visible:outline-2">{m.composer_tools__dismiss()}</button>
        </span>
      ) : null}
    </>
  )
}
