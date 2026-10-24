import { useContext } from 'react'
import { m } from '@/i18n/messages'
import { ShellCtx } from '../lib/shell'
import { Button } from '../ui/button'
import { StateScreen } from './StateScreen'

// A team's page when studio:account can't be read: the account host is down or unreachable. Try again re-runs that
// read through the guard's own query (a second observer here would refetch on mount and loop back to loading).
export function AccountUnreachable({ onRetry }: { onRetry: () => void }) {
  const shell = useContext(ShellCtx)
  const card = (
    <StateScreen label={m.account_unreachable__label()} hue="petrol" page="account-unreachable" title={m.account_unreachable__title()} why={m.account_unreachable__text()}>
      <div className="mt-1 flex flex-wrap items-center gap-3" data-testid="account-unreachable">
        <Button variant="hero" size="pageLg" type="button" onClick={onRetry} data-testid="account-unreachable-retry">
          {m.account_unreachable__retry()}
        </Button>
      </div>
    </StateScreen>
  )
  return shell ? card : <main className="grid min-h-svh bg-background px-4 py-9 md:px-12">{card}</main>
}
