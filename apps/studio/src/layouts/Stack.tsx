import type { I18nNode } from '@pikku/react'
import { cva, type VariantProps } from 'class-variance-authority'

const stack = cva('flex min-w-0', {
  variants: {
    dir: { col: 'flex-col', row: 'flex-row items-center' },
    gap: { none: 'gap-0', sm: 'gap-2', md: 'gap-4', lg: 'gap-7' },
    wrap: { yes: 'flex-wrap', no: '' },
    grow: { yes: 'flex-1', no: '' },
  },
  defaultVariants: { dir: 'col', gap: 'md', wrap: 'no', grow: 'no' },
})

export function Stack({ children, ...v }: { children: I18nNode } & VariantProps<typeof stack>) {
  return <div className={stack(v)}>{children}</div>
}
