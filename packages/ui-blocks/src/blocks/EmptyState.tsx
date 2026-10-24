import type { I18nNode, I18nString } from '@pikku/react'
import { Inbox } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { VariantProps } from 'class-variance-authority'
import { cva } from 'class-variance-authority'

const box = cva('flex flex-col items-center gap-4 rounded-card border border-border bg-card px-6 py-9 text-center shadow-card', {
  variants: { layout: { column: '', row: '' } },
  defaultVariants: { layout: 'column' },
})

function Spot({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="relative grid size-32 shrink-0 place-items-center" aria-hidden="true">
      <svg viewBox="0 0 128 128" className="absolute inset-0 size-full">
        <circle cx="64" cy="66" r="56" className="fill-secondary" />
        <circle cx="98" cy="30" r="20" className="fill-accent" />
        <circle cx="26" cy="96" r="12" className="fill-surface-3" />
        <circle cx="64" cy="66" r="40" fill="none" className="stroke-input" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" />
      </svg>
      <span className="relative grid size-16 place-items-center rounded-card bg-card text-accent-foreground shadow-card">
        <Icon className="size-8" />
      </span>
    </div>
  )
}

export function EmptyState({
  title,
  text,
  children,
  layout,
  icon = Inbox,
}: { title: I18nString; text?: I18nString; children?: I18nNode; icon?: LucideIcon } & VariantProps<typeof box>) {
  return (
    <div className={box({ layout })}>
      <Spot icon={icon} />
      <div>
        <b className="block font-heading text-[22px] text-foreground">{title}</b>
        {text ? <p className="mx-auto mt-1 max-w-ch56 text-[16px] text-pretty text-ink-2">{text}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center justify-center gap-3">{children}</div> : null}
    </div>
  )
}
