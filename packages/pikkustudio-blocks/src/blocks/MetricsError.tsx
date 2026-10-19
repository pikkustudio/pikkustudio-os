import { m } from '@/i18n/messages'
import { useContext } from 'react'
import { NextCard } from './NextCard'
import { PikkuDot } from './PikkuDot'
import { ErrorState, detailsOf, faultOf } from './ErrorState'
import { Button } from '../ui/button'
import { ShellCtx } from '../lib/shell'

/** The numbers could not be read: say so, offer a fix, and let people try again. */
export function MetricsError({ error, retry, retrying }: { error: unknown; retry: () => void; retrying: boolean }) {
  const { say } = useContext(ShellCtx)
  return (
    <>
      <NextCard label={m.metrics_screen__how_answering()} hue="petrol" page="metrics" title={m.metrics_screen__error_title()} why={m.metrics_screen__error_text()}>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="hero" size="pageLg" type="button" onClick={() => say(m.error_state__fix_ask_what({ what: m.metrics_screen__how_answering(), details: detailsOf(faultOf(error), m.metrics_screen__how_answering()) }))}>
            <PikkuDot />
            {m.metrics_screen__fix_it()}
          </Button>
        </div>
      </NextCard>
      <ErrorState error={error} what={m.metrics_screen__how_answering()} onRetry={retry} retrying={retrying} />
    </>
  )
}
