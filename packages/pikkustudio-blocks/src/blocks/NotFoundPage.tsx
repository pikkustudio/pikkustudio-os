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

function Art() {
  return (
    <>
      <circle cx="240" cy="30" r="110" className="fill-w1" />
      <circle cx="40" cy="185" r="95" className="fill-w2" />
      <circle cx="175" cy="135" r="52" className="fill-w3" />
      <circle cx="274" cy="172" r="8" className="fill-coral" />
      <path d="M96 92a10 10 0 0 1 10-10h26l10 12h46a10 10 0 0 1 10 10v50a10 10 0 0 1-10 10h-82a10 10 0 0 1-10-10z" className="fill-w6" opacity="0.92" />
      <circle cx="184" cy="132" r="24" className="fill-w2" />
      <circle cx="184" cy="132" r="24" fill="none" className="stroke-w6" strokeWidth="8" />
      <path d="M202 150l22 22" className="stroke-w6" strokeWidth="9" strokeLinecap="round" />
    </>
  )
}

export function NotFoundPage() {
  const shell = useContext(ShellCtx)
  const location = useLocation()
  const account = useAccount().data
  const signedOut = !!account && !account.signIn && !account.signedIn
  const ask = m.not_found__ask_prompt()
  const card = (
    <StateScreen label={m.not_found__label()} hue="petrol" art={<Art />} title={m.not_found__title()} why={m.not_found__text()}>
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
