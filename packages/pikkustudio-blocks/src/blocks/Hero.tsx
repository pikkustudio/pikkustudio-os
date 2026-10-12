import type { I18nNode, I18nString } from '@pikku/react'
import { HeroArt, type Art } from './HeroArt'

export function Hero({
  hue,
  art,
  title,
  why,
  actions,
  hint,
  thumb,
  side,
  notice,
  children,
}: {
  hue: 'teal' | 'petrol' | 'sea'
  art: Art
  title: I18nString
  why: I18nString
  actions?: I18nNode
  hint?: I18nString
  thumb?: I18nNode
  side?: I18nNode
  notice?: I18nNode
  children?: I18nNode
}) {
  return (
    <section
      data-hue={hue}
      className="relative grid min-h-95 grid-cols-1 overflow-hidden rounded-hero bg-hero text-hero-ink md:grid-cols-hero min-[1700px]:min-h-110"
    >
      <div className="relative z-1 flex flex-col justify-center gap-5 px-13 pt-13 pb-12 min-[1700px]:p-16">
        <div>
          <h1 className="max-w-ch15 text-px56 font-bold text-balance min-[1700px]:text-px66">{title}</h1>
          <p className="mt-4 max-w-ch52 text-px19 text-pretty text-hero-ink-2 min-[1700px]:text-px21">{why}</p>
          {children ? <div className="mt-5">{children}</div> : null}
        </div>
        {actions || hint ? (
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-3">
            {actions}
            {hint ? <span className="text-px15 text-hero-ink-2">{hint}</span> : null}
          </div>
        ) : null}
        {notice}
      </div>
      <div className="relative hidden min-h-55 md:block" aria-hidden="true">
        {side ?? <HeroArt art={art} thumb={thumb} />}
      </div>
    </section>
  )
}
