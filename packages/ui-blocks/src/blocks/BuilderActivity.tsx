import { sep, type I18nString } from '@pikku/react'
import { useEffect, useState } from 'react'
import { Square } from 'lucide-react'
import { m } from '@/i18n/messages'
import type { Doing } from '../lib/builder-chat'
import { Button } from '../ui/button'
import { AiSpinner } from './Spinner'

const DOING: Record<Doing, () => I18nString> = {
  thinking: m.builder_chat__doing_thinking,
  reading: m.builder_chat__doing_reading,
  writing: m.builder_chat__doing_writing,
  checking: m.builder_chat__doing_checking,
  answering: m.builder_chat__doing_answering,
  working: m.builder_chat__doing_working,
}

export function useElapsedMs(since: number | null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (since === null) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [since])
  return since === null ? 0 : Math.max(0, now - since)
}

export const elapsedLabel = (ms: number): I18nString => {
  const total = Math.floor(ms / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = String(total % 60)
  return minutes ? m.builder_chat__elapsed_minutes({ minutes: String(minutes), seconds }) : m.builder_chat__elapsed_seconds({ seconds })
}

export function BuilderActivity({ since, doing, canStop, stopping, onStop }: { since: number; doing: Doing; canStop: boolean; stopping: boolean; onStop: () => void }) {
  const elapsed = useElapsedMs(since)
  return (
    <div className="flex items-center gap-2.5 text-[14px] text-muted-foreground" data-testid="builder-activity">
      <AiSpinner />
      <span className="min-w-0 flex-1" role="status" aria-live="polite">
        <span className="font-semibold text-ink-2">{stopping ? m.builder_chat__stopping() : DOING[doing]()}</span>
        <span className="tabular-nums" aria-hidden="true">
          {sep(' · ')}
          {elapsedLabel(elapsed)}
        </span>
      </span>
      {canStop || stopping ? (
        <Button variant="bordered" size="chipSm" type="button" disabled={stopping} title={m.builder_chat__stop_hint()} onClick={onStop} data-testid="builder-stop">
          <Square className="size-3.5 fill-current" aria-hidden="true" />
          {m.builder_chat__stop()}
        </Button>
      ) : null}
    </div>
  )
}
