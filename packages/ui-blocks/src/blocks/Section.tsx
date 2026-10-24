import type { I18nNode, I18nString } from '@pikku/react'

export function Section({ title, sub, children }: { title: I18nString; sub?: I18nString; children: I18nNode }) {
  return (
    <section className="flex flex-col gap-3.5" aria-label={title}>
      <h2 className="text-px24 font-bold tracking-[-0.012em] text-balance">{title}</h2>
      {sub ? <p className="-mt-2 text-px15 text-muted-foreground text-pretty">{sub}</p> : null}
      {children}
    </section>
  )
}
