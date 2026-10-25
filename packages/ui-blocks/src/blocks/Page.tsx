import type { I18nNode } from '@pikku/react'
import { cva, type VariantProps } from 'class-variance-authority'

const page = cva('mx-auto flex flex-col', {
  variants: {
    width: { default: 'max-w-[1160px] @min-[1700px]/app:max-w-[1380px]', full: 'min-h-full max-w-none' },
    gap: { default: 'gap-7.5', list: 'gap-7', tight: 'gap-5', snug: 'gap-6.5' },
  },
  defaultVariants: { gap: 'default', width: 'default' },
})

export function Page({ children, testId, ...v }: { children: I18nNode; testId?: string } & VariantProps<typeof page>) {
  return (
    <div className={page(v)} data-testid={testId}>
      {children}
    </div>
  )
}
