import { useContext } from 'react'
import { Button } from '../ui/button'
import { ArrowRight, Cloud, Server } from 'lucide-react'

import { OnbCtx } from './OnboardingLayout'
import { useNavigate } from '@tanstack/react-router'

const h1 = 'max-w-[15ch] text-[56px] leading-[1.04] tracking-[-0.02em] group-data-open/shell:text-[46px] @min-[1700px]/app:text-[66px] group-data-open/shell:@min-[1700px]/app:text-[54px] font-bold text-balance'
const lead = 'mt-4 max-w-[52ch] text-[19px] leading-[1.55] text-hero-ink-2 @min-[1700px]/app:text-[21px] text-pretty'
const card =
  'grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-5 rounded-[22px] border border-border bg-card px-7 py-6.5 shadow-card transition-all duration-240 ease-[cubic-bezier(.16,1,.3,1)] hover:-translate-y-0.5 hover:border-input hover:shadow-[0_6px_20px_-4px_rgba(8,40,52,0.16),0_2px_4px_rgba(8,40,52,0.06)]'

const providers = [
  ['OpenAI', 'openai'],
  ['Claude', 'anthropic'],
  ['Grok', 'xai'],
  ['DeepSeek', 'deepseek'],
  ['DeepInfra', 'deepinfra'],
  ['Open-source models', 'ollama'],
] as const

export function ChooseAiScreen() {
  const { st, go, retry, open } = useContext(OnbCtx)
  const navigate = useNavigate()
  const loading = st === 'loading'
  const via = (id: string) => navigate({ to: '.', search: ((prev: object) => ({ ...prev, panel: 'litellm', via: id })) as never, replace: true })

  return (
    <div className="mx-auto flex max-w-[1160px] flex-col gap-10 @min-[1700px]/app:max-w-[1380px]">
      <section
        data-hue="petrol"
        className="relative grid min-h-95 grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] overflow-hidden rounded-[30px] bg-hero text-hero-ink group-data-open/shell:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)] @min-[1700px]/app:min-h-110"
        aria-label="Our recommendation"
      >
        <div className="relative z-1 flex flex-col justify-center gap-5 px-13 pt-13 pb-12 @min-[1700px]/app:p-16 group-data-open/shell:@min-[1700px]/app:p-13">
          <div>
            {st === 'normal' ? (
              <>
                <h1 className={h1}>Bring your own AI.</h1>
                <p className={lead}>Studio builds with your own LiteLLM, a small open-source server that talks to any model. You keep your keys, and you pick the model.</p>
              </>
            ) : null}
            {loading ? (
              <>
                <h1 className={h1}>Getting the choices ready.</h1>
                <p className={lead}>One moment.</p>
              </>
            ) : null}
            {st === 'error' ? (
              <>
                <h1 className={h1}>The choices did not load.</h1>
                <p className={lead}>Nothing was changed. Try again in a moment.</p>
              </>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-3">
            {st === 'error' ? (
              <Button variant="hero" size="pageLg" type="button" onClick={retry}>
                Try again
              </Button>
            ) : (
              <Button variant="hero" size="pageLg" type="button" disabled={loading} onClick={() => open('litellm')}>
                Connect my LiteLLM
                <ArrowRight className="size-5.5" />
              </Button>
            )}
          </div>
          {st === 'normal' ? <p className="text-[15px] text-hero-ink-2">You can change this any time in Settings. I will never switch it without asking.</p> : null}
        </div>
        <div className="relative min-h-55 group-data-open/shell:min-h-0" aria-hidden="true">
          <svg className="absolute inset-0 size-full" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
            <circle cx="368" cy="48" r="248" className="fill-w1" />
            <circle cx="16" cy="408" r="231" className="fill-w2" />
            <circle cx="248" cy="440" r="160" className="fill-w3" opacity=".55" />
            <circle cx="240" cy="190" r="118" className="fill-w5" />
            <circle cx="130" cy="310" r="64" className="fill-w3" />
            <circle cx="130" cy="310" r="78" fill="none" className="stroke-white" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
            <rect x="250" y="300" width="120" height="30" rx="15" className="fill-white" />
            <rect x="250" y="342" width="80" height="30" rx="15" className="fill-w2" />
            <circle cx="352" cy="88" r="12" className="fill-coral" />
          </svg>
        </div>
      </section>

      <section id="alts" aria-label="Other choices">
        <div className="mb-4 flex items-baseline justify-between gap-4">
          <h2 className="text-[26px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">Other ways to connect</h2>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {st === 'normal' || st === 'error' ? (
            <>
              <div className={card}>
                  <span className="grid size-14 place-items-center rounded-2xl bg-indigo text-white">
                    <Cloud className="size-7" />
                  </span>
                  <div>
                    <h3 className="mb-1 text-[22px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">Fabric’s AI</h3>
                    <p className="max-w-ch56 text-[16px] text-ink-2 text-pretty">The best models with nothing to set up. You need a Fabric account, which also hosts your app.</p>
                  </div>
                  <Button variant="bordered" size="page" type="button" onClick={() => open('fabric')}>
                    Read more
                  </Button>
                </div>
              <div className="flex flex-col gap-4 rounded-[22px] border border-border bg-card px-7 py-6.5 shadow-card">
                <div className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-5">
                  <span className="grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
                    <Server className="size-7" />
                  </span>
                  <div>
                    <h3 className="mb-1 text-[22px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">A popular model, through your LiteLLM</h3>
                    <p className="max-w-ch56 text-[16px] text-ink-2 text-pretty">Pick one and I will show you how to point LiteLLM at it. More are easy to add later.</p>
                  </div>
                </div>
                <ul className="flex list-none flex-wrap gap-2.5">
                  {providers.map(([name, id]) => (
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
              <div className="min-h-27.5 animate-shimmer rounded-[22px] bg-[linear-gradient(90deg,var(--secondary),var(--surface-3),var(--secondary))] bg-[length:200%_100%]" role="status" aria-label="Getting the choices ready" />
              <div className="min-h-27.5 animate-shimmer rounded-[22px] bg-[linear-gradient(90deg,var(--secondary),var(--surface-3),var(--secondary))] bg-[length:200%_100%]" aria-hidden="true" />
            </>
          ) : null}
        </div>
      </section>
    </div>
  )
}
