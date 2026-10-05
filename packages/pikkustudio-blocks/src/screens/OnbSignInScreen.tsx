import { Link } from '@tanstack/react-router'
import { useContext } from 'react'
import { Button } from '../ui/button'
import { ArrowRight } from 'lucide-react'
import { useSlots } from '../lib/slots'
import { OnbCtx } from './OnboardingLayout'
import { useAccount, useRecentProjects, useUseLocally } from '../lib/onboarding'


// eslint-disable-next-line @typescript-eslint/no-explicit-any
const keep: any = { search: true }




export function OnbSignInScreen() {
  const { st, go, retry, open } = useContext(OnbCtx)
  const { SignInOffer: Offer } = useSlots()
  const account = useAccount().data
  const recent = useRecentProjects().data ?? []
  const user = account?.name
  const first = user?.split(' ')[0]
  const waiting = recent.length === 1 ? 'Your project is' : `Your ${recent.length} projects are`
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
      <section
        data-hue="teal"
        className="relative grid min-h-95 grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] overflow-hidden rounded-[30px] bg-hero text-hero-ink group-data-open/shell:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)] @min-[1700px]/app:min-h-110"
        aria-label="Our recommendation"
      >
        <div className="relative z-1 flex flex-col justify-center gap-5 px-13 pt-13 pb-12 @min-[1700px]/app:p-16 group-data-open/shell:@min-[1700px]/app:p-13">
          <div>
            {st === 'empty' ? (
              <>
                <h1 className="max-w-[15ch] text-[56px] leading-[1.04] tracking-[-0.02em] group-data-open/shell:text-[46px] @min-[1700px]/app:text-[66px] group-data-open/shell:@min-[1700px]/app:text-[54px] font-bold text-balance">Start on this computer.</h1>
                <p className="mt-4 max-w-[52ch] text-[19px] leading-[1.55] text-hero-ink-2 @min-[1700px]/app:text-[21px] text-pretty">
                  That is our pick for a first visit. Your work stays right here, there is nothing to sign up for, and you can bring in a Fabric account whenever you want to put something online.
                </p>
              </>
            ) : null}
            {st === 'normal' ? (
              <>
                <h1 className="max-w-[15ch] text-[56px] leading-[1.04] tracking-[-0.02em] group-data-open/shell:text-[46px] @min-[1700px]/app:text-[66px] group-data-open/shell:@min-[1700px]/app:text-[54px] font-bold text-balance">Pick up where you left off.</h1>
                <p className="mt-4 max-w-[52ch] text-[19px] leading-[1.55] text-hero-ink-2 @min-[1700px]/app:text-[21px] text-pretty">{waiting} waiting on this computer, exactly as you left {recent.length === 1 ? 'it' : 'them'}.</p>
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
                <h1 className="max-w-[15ch] text-[56px] leading-[1.04] tracking-[-0.02em] group-data-open/shell:text-[46px] @min-[1700px]/app:text-[66px] group-data-open/shell:@min-[1700px]/app:text-[54px] font-bold text-balance">Opening your workspace.</h1>
                <p className="mt-4 max-w-[52ch] text-[19px] leading-[1.55] text-hero-ink-2 @min-[1700px]/app:text-[21px] text-pretty">Just a moment. I am getting everything ready.</p>
              </>
            ) : null}
            {st === 'error' ? (
              <>
                <h1 className="max-w-[15ch] text-[56px] leading-[1.04] tracking-[-0.02em] group-data-open/shell:text-[46px] @min-[1700px]/app:text-[66px] group-data-open/shell:@min-[1700px]/app:text-[54px] font-bold text-balance">Start on this computer, for now.</h1>
                <p className="mt-4 max-w-[52ch] text-[19px] leading-[1.55] text-hero-ink-2 @min-[1700px]/app:text-[21px] text-pretty">
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
        </div>
        <div className="relative min-h-55 group-data-open/shell:min-h-0" aria-hidden="true">
          <svg className="absolute inset-0 size-full" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
            <circle cx="368" cy="48" r="248" className="fill-w1" />
            <circle cx="16" cy="408" r="231" className="fill-w2" />
            <circle cx="248" cy="440" r="160" className="fill-w3" opacity=".55" />
            <circle cx="270" cy="150" r="98" className="fill-w5" />
            <circle cx="270" cy="150" r="116" fill="none" className="stroke-white" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
            <path d="M130 400V300a110 110 0 0 1 220 0v100z" className="fill-w2" />
            <path d="M168 400V306a72 72 0 0 1 144 0v94z" className="fill-w1" />
            <circle cx="240" cy="330" r="9" className="fill-coral" />
          </svg>
        </div>
      </section>

      {st !== 'error' && Offer ? <Offer loading={loading} open={open} done={go} /> : null}
      <p className="text-[13px] text-muted-foreground text-pretty">We never read what you build on this computer.</p>
    </div>
  )
}
