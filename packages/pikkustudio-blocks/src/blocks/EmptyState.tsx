import type { ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const box = cva('flex gap-5 rounded-[22px] border-2 border-dashed border-input p-7 text-ink-2', {
  variants: { layout: { column: 'flex-col items-start', row: 'items-center' } },
  defaultVariants: { layout: 'column' },
})

export function EmptyState({ title, text, children, layout }: { title: string; text: string; children?: ReactNode } & VariantProps<typeof box>) {
  return (
    <div className={box({ layout })}>
      <span className="size-21 shrink-0 overflow-hidden rounded-card">
        <svg viewBox="0 0 40 40" className="block size-full" aria-hidden="true">
          <rect width="40" height="40" className="fill-[#D5E8EB]" />
          <circle cx="34" cy="6" r="22" className="fill-[#BCD6DA]" />
          <circle cx="20" cy="20" r="8" fill="none" className="stroke-white" strokeWidth="2" strokeDasharray="2 4" strokeLinecap="round" />
        </svg>
      </span>
      <div>
        <b className="mb-1 block font-heading text-[20px] text-foreground">{title}</b>
        <p className="max-w-ch56 text-[16px] text-pretty">{text}</p>
        {children ? <div className="mt-3.5 flex flex-wrap items-center gap-3.5">{children}</div> : null}
      </div>
    </div>
  )
}
