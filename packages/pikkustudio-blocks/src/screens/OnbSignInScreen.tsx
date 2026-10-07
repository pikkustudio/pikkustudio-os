import { Link } from '@tanstack/react-router'
import { useContext } from 'react'
import { Button } from '../ui/button'
import { ArrowRight, Laptop, User } from 'lucide-react'
import { Hero as HeroShell, heroH1, heroLead } from '../blocks/OnbHero'
import { useSlots } from '../lib/slots'
import { RowCard, RowStack } from '../blocks/RowCard'
import { OnbCtx } from './OnboardingLayout'
import { useAccount, useRecentProjects, useSignOut, useUseLocally } from '../lib/onboarding'


// eslint-disable-next-line @typescript-eslint/no-explicit-any
const keep: any = { search: true }




export function OnbSignInScreen() {
  const { st, go, retry, open } = useContext(OnbCtx)
  const { SignInOffer: Offer, SignInHero: Hero } = useSlots()
  const account = useAccount().data
  const recent = useRecentProjects().data ?? []
  const user = account?.name
  const first = user?.split(' ')[0]
  const waiting = recent.length === 1 ? 'Your project is' : `Your ${recent.length} projects are`
  const locally = useUseLocally()
  const loading = st === 'loading'
  const signOut = useSignOut()
  if (account?.signedIn && account.signIn === 'fabric') {
    return (
      <div className="mx-auto flex max-w-[1160px] flex-col gap-6 @min-[1700px]/app:max-w-[1380px]">
        <HeroShell hue="teal" art="door">
          <div>
            <h1 className={heroH1}>You are already signed in.</h1>
            <p className={heroLead}>Your Fabric account is connected. To use a different one, sign out first, then sign in again.</p>
          </div>
          <div className="mt-1">
            <Button asChild variant="hero" size="pageLg"><Link {...keep} to="/projects">Go to my projects<ArrowRight className="size-5.5" /></Link></Button>
          </div>
        </HeroShell>
        <RowStack>
          <RowCard tile={<User className="size-5" />} on title={user ?? 'Your Fabric account'} caption="Signed in with Fabric">
            <Button variant="bordered" size="page" disabled={signOut.isPending} onClick={() => signOut.mutate({})}>Sign out</Button>
          </RowCard>
        </RowStack>
      </div>
    )
  }
  const next = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    if (account?.signIn) go()
    else locally.mutate({}, { onSuccess: go })
  }

  return (
    <div className="mx-auto flex max-w-[1160px] flex-col gap-10 @min-[1700px]/app:max-w-[1380px]">
      {Hero ? (
        <Hero st={st} loading={loading} open={open} done={go} />
      ) : (
        <HeroShell hue="teal" art="door">
          <div>
            {st === 'empty' ? (
              <>
                <h1 className={heroH1}>Start on this computer.</h1>
                <p className={heroLead}>
                  That is our pick for a first visit. Your work stays right here, there is nothing to sign up for, and you can bring in a Fabric account whenever you want to put something online.
                </p>
              </>
            ) : null}
            {st === 'normal' ? (
              <>
                <h1 className={heroH1}>Pick up where you left off.</h1>
                <p className={heroLead}>{waiting} waiting on this computer, exactly as you left {recent.length === 1 ? 'it' : 'them'}.</p>
                <div className="mt-5 flex flex-wrap gap-2.5">
                  {recent.map((r) => (
                    <span key={r.key} className="flex items-center gap-2.5 rounded-full bg-hero-ink/14 py-1.5 pr-4 pl-1.5 text-[15px] font-bold">
                      <span className="block size-9 overflow-hidden rounded-full">
                        <svg viewBox="0 0 40 40" className="block size-full" aria-hidden="true">
                          <rect width="40" height="40" fill={r.colors[0]} />
                          <circle cx="32" cy="8" r="20" fill={r.colors[1]} opacity=".9" />
                        </svg>
                      </span>
                      {r.name}
                    </span>
                  ))}
                </div>
              </>
            ) : null}
            {loading ? (
              <>
                <h1 className={heroH1}>Opening your workspace.</h1>
                <p className={heroLead}>Just a moment. I am getting everything ready.</p>
              </>
            ) : null}
            {st === 'error' ? (
              <>
                <h1 className={heroH1}>Start on this computer, for now.</h1>
                <p className={heroLead}>
                  Something did not load, so this is the way in that works right now. Everything you make stays safe here.
                </p>
              </>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-3">
            <Button asChild variant="hero" size="pageLg"><Link {...keep} to={account?.name ? '/choose-ai' : '/your-name'} onClick={next} aria-busy={loading}>
              {loading ? <span className="size-4.5 animate-[spin_0.8s_linear_infinite] rounded-full border-[2.5px] border-current border-r-transparent" /> : null}
              {loading ? 'Opening' : 'Use on this computer'}
              {loading ? null : <ArrowRight className="size-5.5" />}
            </Link></Button>
            {st === 'empty' ? <span className="text-[15px] text-hero-ink-2">Takes about five seconds.</span> : null}
            {st === 'normal' ? <span className="text-[15px] text-hero-ink-2">Your projects open straight away.</span> : null}
          </div>
        </HeroShell>
      )}

      {Hero ? (
        <section aria-label="The other way in">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-[26px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">Want to use pure OSS?</h2>
            <p className="text-[15px] text-muted-foreground text-pretty">Everything stays on this computer.</p>
          </div>
          <div className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-5 rounded-[22px] border border-border bg-card px-7 py-6.5 shadow-card">
            <span className="grid size-14 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Laptop className="size-7" />
            </span>
            <div>
              <h3 className="mb-1 text-[22px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">Use it on this computer</h3>
              <p className="max-w-ch56 text-[16px] text-ink-2 text-pretty">No account, nothing to sign up for. Bring in a Fabric account whenever you want to put something online.</p>
            </div>
            <Button asChild variant="bordered" size="page">
              <Link {...keep} to={account?.name ? '/choose-ai' : '/your-name'} onClick={next} aria-busy={loading}>
                {loading ? 'Opening' : 'Use on this computer'}
              </Link>
            </Button>
          </div>
        </section>
      ) : null}

      {st !== 'error' && Offer ? <Offer loading={loading} open={open} done={go} /> : null}
      <p className="text-[13px] text-muted-foreground text-pretty">We never read what you build on this computer.</p>
    </div>
  )
}
