import type { I18nNode } from '@pikku/react'
import { cva, type VariantProps } from 'class-variance-authority'

const grid = cva('grid gap-4', {
  variants: {
    cols: { two: 'grid-cols-1 md:grid-cols-2', three: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' },
  },
  defaultVariants: { cols: 'two' },
})

export function Grid({ children, ...v }: { children: I18nNode } & VariantProps<typeof grid>) {
  return <div className={grid(v)}>{children}</div>
}
