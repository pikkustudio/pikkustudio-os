import { useContext } from 'react'
import { useLocation } from '@tanstack/react-router'
import { m } from '@/i18n/messages'
import { ShellCtx } from '../lib/shell'
import { useAccount } from '../lib/onboarding'
import { signInPath, signInSearch } from '../lib/sign-in-redirect'
import { Button } from '../ui/button'
import { Link } from './Link'
import { PikkuDot } from './PikkuDot'
import { StateScreen } from './StateScreen'

export function NotFoundPage() {
  const shell = useContext(ShellCtx)
  const location = useLocation()
  const account = useAccount().data
  const signedOut = !!account && !account.signIn && !account.signedIn
  const ask = m.not_found__ask_prompt()
  const card = (
    <StateScreen label={m.not_found__label()} hue="petrol" page="not-found" title={m.not_found__title()} why={m.not_found__text()}>
      <div className="mt-1 flex flex-wrap items-center gap-3" data-testid="not-found">
        {signedOut ? (
          <Button asChild variant="hero" size="pageLg">
            <Link to={signInPath() as never} search={signInSearch(location.pathname + location.searchStr) as never}>{m.not_found__sign_in()}</Link>
          </Button>
        ) : null}
        <Button asChild variant={signedOut ? 'heroGhost' : 'hero'} size="pageLg">
          <Link to="/">{m.not_found__teams()}</Link>
        </Button>
        {shell ? (
          <Button variant="heroGhost" size="pageLg" type="button" onClick={() => shell.say(ask)}>
            <PikkuDot />
            {m.not_found__ask()}
          </Button>
        ) : (
          <Button asChild variant="heroGhost" size="pageLg">
            <Link to={'/projects' as never} search={{ panel: 'chat' } as never}>
              <PikkuDot />
              {m.not_found__ask()}
            </Link>
          </Button>
        )}
      </div>
    </StateScreen>
  )
  return shell ? card : <main className="grid min-h-svh bg-background px-4 py-9 md:px-12">{card}</main>
}
