import type { ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

const page = cva('mx-auto flex max-w-[1160px] flex-col @min-[1700px]/app:max-w-[1380px]', {
  variants: {
    gap: { default: 'gap-7.5', list: 'gap-7', tight: 'gap-5', snug: 'gap-6.5' },
  },
  defaultVariants: { gap: 'default' },
})

export function Page({ children, ...v }: { children: ReactNode } & VariantProps<typeof page>) {
  return <div className={page(v)}>{children}</div>
}
