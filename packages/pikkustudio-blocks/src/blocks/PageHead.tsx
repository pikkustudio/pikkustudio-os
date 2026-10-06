import type { ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { PinButton } from './PinButton'

const head = cva('flex flex-wrap justify-between gap-5', {
  variants: { align: { start: 'items-start', end: 'items-end' } },
  defaultVariants: { align: 'start' },
})

const body = cva('', {
  variants: { width: { fill: 'shrink grow basis-130', fit: '' } },
  defaultVariants: { width: 'fill' },
})

const lead = cva('text-pretty text-ink-2', {
  variants: { size: { default: 'mt-2 max-w-[64ch] text-[16px]', lead: 'mt-1.5 max-w-ch62 text-[17px]' } },
  defaultVariants: { size: 'default' },
})

export function PageHead({ crumb, title, text, children, size, width, ...v }: { crumb: string; title: string; text?: string; children?: ReactNode } & VariantProps<typeof head> & VariantProps<typeof lead> & VariantProps<typeof body>) {
  return (
    <div className={head(v)}>
      <div className={body({ width })}>
        <div className="mb-1 text-[14px] font-semibold text-muted-foreground">{crumb}</div>
        <h1 className="text-[40px] leading-[1.08] font-bold tracking-[-0.012em] text-balance">{title}</h1>
        {text ? <p className={lead({ size })}>{text}</p> : null}
      </div>
      <div className="flex items-start gap-2.5">
        {children}
        <PinButton />
      </div>
    </div>
  )
}
