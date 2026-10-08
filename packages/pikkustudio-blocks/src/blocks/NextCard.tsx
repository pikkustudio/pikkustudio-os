import type { I18nNode, I18nString } from '@pikku/react'

export function NextCard({ label, hue, title, why, art, children }: { label: I18nString; hue: 'teal' | 'petrol' | 'sea'; title: I18nString; why: I18nString; art: I18nNode; children?: I18nNode }) {
  return (
    <section data-hue={hue} className="relative grid grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] overflow-hidden rounded-next bg-hero text-hero-ink" aria-label={label}>
      <div className="relative z-1 flex flex-col justify-center gap-3.5 px-10 pt-8.5 pb-9">
        <h2 className="max-w-ch20 text-px36 font-bold tracking-[-0.02em] text-hero-ink text-balance">{title}</h2>
        <p className="max-w-ch54 text-px175 text-hero-ink-2 text-pretty">{why}</p>
        {children}
      </div>
      <div className="relative min-h-42.5">
        <svg viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden="true">
          {art}
        </svg>
      </div>
    </section>
  )
}
