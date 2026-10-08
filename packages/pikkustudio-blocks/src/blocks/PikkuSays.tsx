import type { I18nNode, I18nString } from '@pikku/react'

export function PikkuMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 300" className={className} aria-hidden="true">
      <use href="#pikku-mark" />
    </svg>
  )
}
export function PikkuSays({ text, tone = 'card', children }: { text: I18nString; tone?: 'card' | 'plain'; children?: I18nNode }) {
  const big = tone === 'card'
  return (
    <div className={`flex items-start gap-3 ${big ? 'rounded-card border border-border bg-card p-5' : ''}`}>
      <span data-hue="petrol" className={`grid shrink-0 place-items-center rounded-full bg-hero text-hero-ink ${big ? 'size-12' : 'size-9'}`}>
        <PikkuMark className={big ? 'size-7' : 'size-5'} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <p className={`max-w-ch54 leading-[1.45] text-pretty ${big ? 'text-[17px]' : 'text-[15px]'}`}>{text}</p>
        {children && <div className="flex flex-wrap gap-3">{children}</div>}
      </div>
    </div>
  )
}
