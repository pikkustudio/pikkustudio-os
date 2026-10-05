import { ArrowRight } from 'lucide-react'
import { useContext, useState } from 'react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Textarea } from '../ui/textarea'
import { useAccount, useSetProfile } from '../lib/onboarding'
import { OnbCtx } from './OnboardingLayout'

const h1 = 'max-w-[15ch] text-[56px] leading-[1.04] tracking-[-0.02em] group-data-open/shell:text-[46px] @min-[1700px]/app:text-[66px] group-data-open/shell:@min-[1700px]/app:text-[54px] font-bold text-balance'
const lead = 'mt-4 max-w-[52ch] text-[19px] leading-[1.55] text-hero-ink-2 @min-[1700px]/app:text-[21px] text-pretty'
const label = 'font-heading text-[18px] font-semibold'

export function OnbNameScreen() {
  const { st, retry } = useContext(OnbCtx)
  const { go } = useContext(OnbCtx)
  const account = useAccount().data
  const save = useSetProfile()
  const [name, setName] = useState<string | null>(null)
  const [about, setAbout] = useState<string | null>(null)
  const nameValue = name ?? account?.name ?? ''
  const aboutValue = about ?? account?.about ?? ''
  const loading = st === 'loading'
  const ready = nameValue.trim().length > 0 && !save.isPending

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!ready) return
    save.mutate({ name: nameValue.trim(), about: aboutValue.trim() || undefined }, { onSuccess: go })
  }

  return (
    <div className="mx-auto flex max-w-[1160px] flex-col gap-10 @min-[1700px]/app:max-w-[1380px]">
      <section
        data-hue="teal"
        className="relative grid min-h-95 grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] overflow-hidden rounded-[30px] bg-hero text-hero-ink group-data-open/shell:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)] @min-[1700px]/app:min-h-110"
        aria-label="About you"
      >
        <div className="relative z-1 flex flex-col justify-center gap-5 px-13 pt-13 pb-12 @min-[1700px]/app:p-16 group-data-open/shell:@min-[1700px]/app:p-13">
          {loading ? (
            <div>
              <h1 className={h1}>One moment.</h1>
              <p className={lead}>Getting things ready.</p>
            </div>
          ) : st === 'error' ? (
            <div>
              <h1 className={h1}>That did not load.</h1>
              <p className={lead}>Nothing was changed. Try again in a moment.</p>
              <div className="mt-5">
                <Button variant="hero" size="pageLg" type="button" onClick={retry}>
                  Try again
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={submit} className="flex flex-col gap-5">
              <div>
                <h1 className={h1}>What should I call you?</h1>
                <p className={lead}>A first name is plenty. I use it when I talk to you, and anything you tell me about your work helps me answer in a way that suits you.</p>
              </div>
              <label htmlFor="name" className={label}>
                Your name
              </label>
              <Input
                id="name"
                autoComplete="given-name"
                value={nameValue}
                onChange={(e) => setName(e.target.value)}
                placeholder="Maya"
                className="h-14 max-w-[28rem] rounded-[20px] border-[2.5px] border-transparent bg-field px-5.5 font-heading text-[20px] font-medium text-foreground shadow-none placeholder:text-muted-foreground hover:border-hero-ink/45 focus-visible:border-hero-ink focus-visible:ring-5 focus-visible:ring-hero-ink/25 md:text-[20px]"
              />
              <label htmlFor="about" className={label}>
                What do you do? <span className="font-normal text-hero-ink-2">Optional</span>
              </label>
              <Textarea
                id="about"
                tone="hero"
                value={aboutValue}
                onChange={(e) => setAbout(e.target.value)}
                placeholder="For example: I run baking classes in Leeds and I am not technical."
                className="min-h-24 max-w-[34rem]"
              />
              {save.isError ? (
                <p role="alert" className="text-[16px] font-semibold">
                  That could not be saved. Try again.
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                <Button variant="hero" size="pageLg" type="submit" disabled={!ready} aria-busy={save.isPending}>
                  <span>{save.isPending ? 'Saving' : 'Continue'}</span>
                  {save.isPending ? null : <ArrowRight className="size-5.5" />}
                </Button>
                <span className="text-[15px] text-hero-ink-2">You can change this any time in your account.</span>
              </div>
            </form>
          )}
        </div>
        <div className="relative min-h-55 group-data-open/shell:min-h-0" aria-hidden="true">
          <svg className="absolute inset-0 size-full" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
            <circle cx="368" cy="48" r="248" className="fill-w1" />
            <circle cx="16" cy="408" r="231" className="fill-w2" />
            <circle cx="248" cy="440" r="160" className="fill-w3" opacity=".55" />
            <circle cx="270" cy="150" r="98" className="fill-w5" />
            <circle cx="270" cy="150" r="116" fill="none" className="stroke-white" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
            <circle cx="240" cy="330" r="9" className="fill-coral" />
          </svg>
        </div>
      </section>
    </div>
  )
}
