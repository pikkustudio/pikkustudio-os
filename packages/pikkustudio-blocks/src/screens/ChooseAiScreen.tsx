import { m } from '@/i18n/messages'
import { CloudOffer } from '../blocks/CloudPanel'
import { useContext } from 'react'
import { Button } from '../ui/button'
import { ArrowRight, Cloud, Server } from 'lucide-react'

import { providers } from '../blocks/AiConnectPanels'
import { Hero as HeroShell, heroH1 as h1, heroLead as lead } from '../blocks/OnbHero'
import { OnbCtx } from './OnboardingLayout'
import { useSlots } from '../lib/slots'
import { useNavigate } from '@tanstack/react-router'

const card =
  'grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-5 rounded-[22px] border border-border bg-card px-7 py-6.5 shadow-card transition-all duration-240 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-0.5 hover:border-input hover:shadow-[0_6px_20px_-4px_rgba(8,40,52,0.16),0_2px_4px_rgba(8,40,52,0.06)]'



export function LitellmHero({ st, loading, open, retry }: { st: string; loading: boolean; open: (p: 'litellm') => void; retry: () => void }) {
  return (
    <HeroShell hue="petrol" art="ai">
<div>
        {st === 'normal' ? (
          <>
            <h1 className={h1}>{m.choose_ai_screen__title()}</h1>
            <p className={lead}>{m.choose_ai_screen__lead()}</p>
          </>
        ) : null}
        {loading ? (
          <>
            <h1 className={h1}>{m.choose_ai_screen__loading_title()}</h1>
            <p className={lead}>{m.onb_name_screen__loading_title()}</p>
          </>
        ) : null}
        {st === 'error' ? (
          <>
            <h1 className={h1}>{m.choose_ai_screen__error_title()}</h1>
            <p className={lead}>{m.onb_name_screen__error_text()}</p>
          </>
        ) : null}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-3">
        {st === 'error' ? (
          <Button variant="hero" size="pageLg" type="button" onClick={retry}>
            {m.signin__retry()}
          </Button>
        ) : (
          <Button variant="hero" size="pageLg" type="button" disabled={loading} onClick={() => open('litellm')}>
            {m.choose_ai_screen__connect()}
            <ArrowRight className="rtl:-scale-x-100 size-5.5" />
          </Button>
        )}
      </div>
      {st === 'normal' ? <p className="text-[15px] text-hero-ink-2">{m.choose_ai_screen__change_later()}</p> : null}
    </HeroShell>
  )
}

export function ChooseAiScreen() {
  const { st, go, retry, open } = useContext(OnbCtx)
  const { AiOffer: Offer, AiHero: Hero } = useSlots()
  const navigate = useNavigate()
  const loading = st === 'loading'
  const via = (id: string) => navigate({ to: '.', search: ((prev: object) => ({ ...prev, panel: 'provider', via: id })) as never, replace: true })

  return (
    <div className="mx-auto flex max-w-[1160px] flex-col gap-10 @min-[1700px]/app:max-w-[1380px]">
      {Hero ? (
        <Hero st={st} loading={loading} open={open} retry={retry} done={go} />
      ) : (
        <LitellmHero st={st} loading={loading} open={open} retry={retry} />
      )}

      <section id="alts" aria-label={m.choose_ai_screen__other_choices()}>
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-[26px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">{m.choose_ai_screen__other_ways()}</h2>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {st === 'normal' || st === 'error' ? (
            <>
              {Offer ? <Offer open={open} /> : <CloudOffer open={open} />}
              <div className="flex flex-col gap-4 rounded-[22px] border border-border bg-card px-7 py-6.5 shadow-card">
                <div className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-5">
                  <span className="grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
                    <Server className="size-7" />
                  </span>
                  <div>
                    <h3 className="mb-1 text-[22px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">{m.choose_ai_screen__providers_title()}</h3>
                    <p className="max-w-ch56 text-[16px] text-ink-2 text-pretty">{m.choose_ai_screen__providers_text()}</p>
                  </div>
                </div>
                <ul className="flex list-none flex-wrap gap-2.5">
                  {providers().map(([name, id]) => (
                    <li key={id}>
                      <Button variant="bordered" size="page" type="button" onClick={() => via(id)}>
                        {name}
                      </Button>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : null}
          {loading ? (
            <>
              <div className="min-h-27.5 animate-shimmer rounded-[22px] bg-[linear-gradient(90deg,var(--secondary),var(--surface-3),var(--secondary))] bg-[length:200%_100%]" role="status" aria-label={m.choose_ai_screen__getting_ready()} />
              <div className="min-h-27.5 animate-shimmer rounded-[22px] bg-[linear-gradient(90deg,var(--secondary),var(--surface-3),var(--secondary))] bg-[length:200%_100%]" aria-hidden="true" />
            </>
          ) : null}
        </div>
      </section>
    </div>
  )
}
