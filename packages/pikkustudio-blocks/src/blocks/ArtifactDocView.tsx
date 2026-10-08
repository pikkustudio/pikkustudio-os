import { asI18n } from '@pikku/react'
import type { Artifact } from '../types/artifacts'

export function ArtifactDocView({ item }: { item: Artifact }) {
  const blocks = (item.text ?? '').split(/\n{2,}/).map((b) => b.trim()).filter(Boolean)
  return (
    <div className="rounded-card border border-border bg-secondary p-6 shadow-card">
      <article className="mx-auto flex max-w-[720px] flex-col gap-4 rounded-lg border border-border bg-card px-12 py-10 shadow-lg">
        {blocks.map((b, i) => {
          const heading = b.match(/^(#{1,3})\s+(.+)$/)
          const headingText: string = heading ? heading[2] : ''
          return heading ? (
            <h3 key={i} className={heading[1].length === 1 ? 'text-[24px] font-bold' : 'text-[18px] font-bold'}>{asI18n(headingText)}</h3>
          ) : (
            <p key={i} className="text-[16px] leading-[1.65] whitespace-pre-line text-ink-2">{asI18n(b)}</p>
          )
        })}
      </article>
    </div>
  )
}
