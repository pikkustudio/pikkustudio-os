import { Link } from '../blocks/Link'
import { useContext, type ComponentType } from 'react'
import { Button } from '../ui/button'
import { ArrowRight, Laptop, User } from 'lucide-react'
import { Hero as HeroShell, heroH1, heroLead } from '../blocks/OnbHero'
import { useCopy } from '../lib/copy'
import { RowCard, RowStack } from '../blocks/RowCard'
import { OnbCtx, type PanelId } from './OnboardingLayout'
import { useAccount, useRecentProjects, useSignOut, useUseLocally } from '../lib/onboarding'
import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'


// eslint-disable-next-line @typescript-eslint/no-explicit-any
const keep: any = { search: true }




function SignedInNotice() {
  const user = useAccount().data?.name
  const copy = useCopy()
  const signOut = useSignOut()
  return (
    <div className="mx-auto flex max-w-[1160px] flex-col gap-6 @min-[1700px]/app:max-w-[1380px]">
      <HeroShell hue="teal" page="sign-in">
        <div>
          <h1 className={heroH1}>{m.onb_sign_in_screen__already_signed_in()}</h1>
          <p className={heroLead}>{copy.signedInLead()}</p>
        </div>
        <div className="mt-1">
          <Button asChild variant="hero" size="pageLg"><Link {...keep} to="/projects">{m.onb_sign_in_screen__go_to_projects()}<ArrowRight className="rtl:-scale-x-100 size-5.5" /></Link></Button>
        </div>
      </HeroShell>
      <RowStack>
        <RowCard tile={<User className="size-5" />} on title={user ? asI18n(user) : copy.accountFallback()} caption={copy.signedInCaption()}>
          <Button variant="bordered" size="page" disabled={signOut.isPending} onClick={() => signOut.mutate({})}>{m.account_screen__sign_out()}</Button>
        </RowCard>
      </RowStack>
    </div>
  )
}

/** What a hero on the sign-in step is handed. */
export type SignInHeroProps = { st: string; loading: boolean; open: (panel: PanelId | '') => void; done: () => void }

/** The sign-in step. A host that signs people in elsewhere gives its own `hero`; using Studio here is then the other way. */
export function OnbSignInScreen({ hero }: { hero?: ComponentType<SignInHeroProps> } = {}) {
  const account = useAccount()
  if (account.data?.signedIn && account.data.signIn && account.data.signIn !== 'local') return <SignedInNotice />
  return <SignInChoices hero={hero} />
}

// The sign-in step's own hero: use Studio here, on this computer.
function LocalSignInHero({ st, loading, done }: { st: string; loading: boolean; done: () => void }) {
  const copy = useCopy()
  const account = useAccount().data
  const recent = useRecentProjects().data ?? []
  const locally = useUseLocally()
  const next = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    if (account?.signIn) done()
    else locally.mutate({}, { onSuccess: done })
  }
  return (
    <HeroShell hue="teal" page="sign-in">
      <div>
        {st === 'empty' ? (
          <>
            <h1 className={heroH1}>{m.onb_sign_in_screen__start_here()}</h1>
            <p className={heroLead}>{copy.startLead()}</p>
          </>
        ) : null}
        {st === 'normal' ? (
          <>
            <h1 className={heroH1}>{m.onb_sign_in_screen__pick_up()}</h1>
            <p className={heroLead}>{m.onb_sign_in_screen__waiting({ count: recent.length })}</p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              {recent.map((r) => {
                const projectName = asI18n(r.name)
                return (
                <span key={r.key} className="flex items-center gap-2.5 rounded-full bg-hero-ink/14 py-1.5 pe-4 ps-1.5 text-[15px] font-bold">
                  <span className="block size-9 overflow-hidden rounded-full">
                    <svg viewBox="0 0 40 40" className="block size-full" aria-hidden="true">
                      <rect width="40" height="40" fill={r.colors[0]} />
                      <circle cx="32" cy="8" r="20" fill={r.colors[1]} opacity=".9" />
                    </svg>
                  </span>
                  {projectName}
                </span>
                )
              })}
            </div>
          </>
        ) : null}
        {loading ? (
          <>
            <h1 className={heroH1}>{m.onb_sign_in_screen__opening_workspace()}</h1>
            <p className={heroLead}>{m.onb_sign_in_screen__moment()}</p>
          </>
        ) : null}
        {st === 'error' ? (
          <>
            <h1 className={heroH1}>{m.onb_sign_in_screen__start_for_now()}</h1>
            <p className={heroLead}>
              {m.onb_sign_in_screen__did_not_load()}
            </p>
          </>
        ) : null}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-3">
        <Button asChild variant="hero" size="pageLg"><Link {...keep} to={account?.name ? '/choose-ai' : '/your-name'} onClick={next} aria-busy={loading}>
          {loading ? <span className="size-4.5 animate-[spin_0.8s_linear_infinite] rounded-full border-[2.5px] border-current border-e-transparent" /> : null}
          {loading ? m.onb_sign_in_screen__opening() : m.onb_sign_in_screen__use_here()}
          {loading ? null : <ArrowRight className="rtl:-scale-x-100 size-5.5" />}
        </Link></Button>
        {st === 'empty' ? <span className="text-[15px] text-hero-ink-2">{m.onb_sign_in_screen__five_seconds()}</span> : null}
        {st === 'normal' ? <span className="text-[15px] text-hero-ink-2">{m.onb_sign_in_screen__open_straight_away()}</span> : null}
      </div>
    </HeroShell>
  )
}

function SignInChoices({ hero }: { hero?: ComponentType<SignInHeroProps> }) {
  const { st, go, open } = useContext(OnbCtx)
  const Hero = hero ?? LocalSignInHero
  const hosted = !!hero
  const copy = useCopy()
  const account = useAccount().data
  const locally = useUseLocally()
  const loading = st === 'loading'
  const next = (e: React.MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    if (account?.signIn) go()
    else locally.mutate({}, { onSuccess: go })
  }

  return (
    <div className="mx-auto flex max-w-[1160px] flex-col gap-10 @min-[1700px]/app:max-w-[1380px]">
      <Hero st={st} loading={loading} open={open} done={go} />

      {hosted ? (
        <section aria-label={m.onb_sign_in_screen__other_way()}>
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-[26px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">{m.onb_sign_in_screen__pure_oss()}</h2>
            <p className="text-[15px] text-muted-foreground text-pretty">{m.onb_sign_in_screen__stays_here()}</p>
          </div>
          <div className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-5 rounded-[22px] border border-border bg-card px-7 py-6.5 shadow-card">
            <span className="grid size-14 place-items-center rounded-xl bg-accent text-accent-foreground">
              <Laptop className="size-7" />
            </span>
            <div>
              <h3 className="mb-1 text-[22px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">{m.onb_sign_in_screen__use_it_here()}</h3>
              <p className="max-w-ch56 text-[16px] text-ink-2 text-pretty">{copy.useHereNote()}</p>
            </div>
            <Button asChild variant="bordered" size="page">
              <Link {...keep} to={account?.name ? '/choose-ai' : '/your-name'} onClick={next} aria-busy={loading}>
                {loading ? m.onb_sign_in_screen__opening() : m.onb_sign_in_screen__use_here()}
              </Link>
            </Button>
          </div>
        </section>
      ) : null}

      <p className="text-[13px] text-muted-foreground text-pretty">{m.onb_sign_in_screen__never_read()}</p>
    </div>
  )
}
