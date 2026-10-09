import { useContext } from 'react'
import { LoaderCircle, RefreshCw, TriangleAlert } from 'lucide-react'
import type { I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { ShellCtx } from '../lib/shell'
import { Button } from '../ui/button'
import { PikkuDot } from './PikkuDot'

export function FixNotice({ title, body, ask, onRetry, retrying }: { title: I18nString; body: I18nString; ask: I18nString; onRetry?: () => void; retrying?: boolean }) {
  const { say } = useContext(ShellCtx)
  return (
    <div role="alert" className="rounded-card bg-destructive-soft p-5 text-foreground" data-testid="fix-notice">
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <b className="block text-px17">{title}</b>
          <p className="mt-0.5 max-w-ch56 text-px15 text-pretty text-foreground">{body}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button variant="default" size="compact" type="button" onClick={() => say(ask)}>
              <PikkuDot />
              {m.metrics_screen__fix_it()}
            </Button>
            {onRetry ? (
              <Button variant="bordered" size="compact" type="button" onClick={onRetry} disabled={retrying} aria-busy={retrying}>
                {retrying ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                {retrying ? m.action_notice__retrying() : m.query_state__try_again()}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
