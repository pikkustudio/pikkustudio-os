import type { I18nNode } from '@pikku/react'
import { cva, type VariantProps } from 'class-variance-authority'

const page = cva('mx-auto flex w-full flex-col', {
  variants: {
    size: {
      default: 'max-w-5xl gap-7 px-8 py-8',
      setup: 'max-w-300 gap-10 px-12 pt-9 pb-7 min-[1700px]:max-w-369',
      project: 'max-w-290 gap-7.5 px-12 pt-9 pb-7',
    },
  },
  defaultVariants: { size: 'default' },
})

export function Page({ children, ...v }: { children: I18nNode } & VariantProps<typeof page>) {
  return <div className={page(v)}>{children}</div>
}
