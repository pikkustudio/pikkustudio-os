import type { ReactNode } from 'react'

export function WaySection({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section aria-label={title}>
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-px26 font-bold text-balance">{title}</h2>
        {sub ? <p className="text-px15 text-pretty text-muted-foreground">{sub}</p> : null}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}
