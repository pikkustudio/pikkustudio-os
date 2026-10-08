import type { I18nNode } from '@pikku/react'
import { m } from '@/i18n/messages'

export const heroH1 = 'max-w-[15ch] text-[56px] leading-[1.04] tracking-[-0.02em] group-data-open/shell:text-[46px] @min-[1700px]/app:text-[66px] group-data-open/shell:@min-[1700px]/app:text-[54px] font-bold text-balance'
export const heroLead = 'mt-4 max-w-[52ch] text-[19px] leading-[1.55] text-hero-ink-2 @min-[1700px]/app:text-[21px] text-pretty'

export function HeroArt({ variant }: { variant: 'ai' | 'door' }) {
  return (
    <svg className="absolute inset-0 size-full" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
      <circle cx="368" cy="48" r="248" className="fill-w1" />
      <circle cx="16" cy="408" r="231" className="fill-w2" />
      <circle cx="248" cy="440" r="160" className="fill-w3" opacity=".55" />
      {variant === 'ai' ? (
        <>
          <circle cx="240" cy="190" r="118" className="fill-w5" />
          <circle cx="130" cy="310" r="64" className="fill-w3" />
          <circle cx="130" cy="310" r="78" fill="none" className="stroke-white" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
          <rect x="250" y="300" width="120" height="30" rx="15" className="fill-white" />
          <rect x="250" y="342" width="80" height="30" rx="15" className="fill-w2" />
          <circle cx="352" cy="88" r="12" className="fill-coral" />
        </>
      ) : (
        <>
          <circle cx="270" cy="150" r="98" className="fill-w5" />
          <circle cx="270" cy="150" r="116" fill="none" className="stroke-white" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
          <path d="M130 400V300a110 110 0 0 1 220 0v100z" className="fill-w2" />
          <path d="M168 400V306a72 72 0 0 1 144 0v94z" className="fill-w1" />
          <circle cx="240" cy="330" r="9" className="fill-coral" />
        </>
      )}
    </svg>
  )
}

export function Hero({ hue, art, children }: { hue: string; art: 'ai' | 'door'; children: I18nNode }) {
  return (
    <section
      data-hue={hue}
      className="relative grid min-h-95 grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] overflow-hidden rounded-[30px] bg-hero text-hero-ink group-data-open/shell:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)] @min-[1700px]/app:min-h-110"
      aria-label={m.onb_hero__recommendation()}
    >
      <div className="relative z-1 flex flex-col justify-center gap-5 px-13 pt-13 pb-12 @min-[1700px]/app:p-16 group-data-open/shell:@min-[1700px]/app:p-13">{children}</div>
      <div className="relative min-h-55 group-data-open/shell:min-h-0" aria-hidden="true">
        <HeroArt variant={art} />
      </div>
    </section>
  )
}
