import type { I18nNode } from '@pikku/react'
import { m } from '@/i18n/messages'
import { PageArt } from './PageArt'

export const heroH1 = 'max-w-[15ch] text-[56px] leading-[1.04] tracking-[-0.02em] group-data-open/shell:text-[46px] @min-[1700px]/app:text-[66px] group-data-open/shell:@min-[1700px]/app:text-[54px] font-bold text-balance'
export const heroLead = 'mt-4 max-w-[52ch] text-[19px] leading-[1.55] text-hero-ink-2 @min-[1700px]/app:text-[21px] text-pretty'

export function Hero({ hue, page, children }: { hue: string; page: string; children: I18nNode }) {
  return (
    <section
      data-hue={hue}
      className="relative grid min-h-95 grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] overflow-hidden rounded-[30px] bg-hero text-hero-ink group-data-open/shell:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)] @min-[1700px]/app:min-h-110"
      aria-label={m.onb_hero__recommendation()}
    >
      <div className="relative z-1 flex flex-col justify-center gap-5 px-13 pt-13 pb-12 @min-[1700px]/app:p-16 group-data-open/shell:@min-[1700px]/app:p-13">{children}</div>
      <div className="relative min-h-55 group-data-open/shell:min-h-0" aria-hidden="true">
        <PageArt page={page} />
      </div>
    </section>
  )
}
