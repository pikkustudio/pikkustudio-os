import type { I18nProps } from '@pikkustudio/blocks/lib/i18n-props'
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const textareaVariants = cva(
  'flex w-full rounded-md border bg-transparent px-3 py-2 transition-all outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      tone: {
        default: 'min-h-16 border-input text-base shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm',
        hero: 'min-h-28 border-transparent px-5 py-4 text-lg text-hero-ink placeholder:text-hero-ink-2/70 focus-visible:ring-3 focus-visible:ring-hero-ink/40',
      },
    },
    defaultVariants: { tone: 'default' },
  }
)

function Textarea({ className, tone, ...props }: I18nProps<React.ComponentProps<'textarea'>> & VariantProps<typeof textareaVariants>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(textareaVariants({ tone }), className)}
      {...props}
    />
  )
}

export { Textarea }
