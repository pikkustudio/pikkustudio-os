import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

const textareaVariants = cva(
  'flex w-full rounded-md border bg-transparent px-3 py-2 transition-all outline-none disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      tone: {
        default: 'min-h-16 border-input text-base shadow-xs placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm',
        hero: 'min-h-32 resize-y rounded-[20px] border-[2.5px] border-transparent bg-field px-5.5 py-4.5 font-heading text-[20px] leading-[1.45] font-medium text-foreground placeholder:text-muted-foreground hover:border-hero-ink/45 focus-visible:border-hero-ink focus-visible:ring-5 focus-visible:ring-hero-ink/25',
        field: 'min-h-11 resize-y rounded-xl border-[1.5px] border-input bg-field px-3.5 py-2.5 text-px15 leading-[1.45] text-foreground hover:border-muted-foreground focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-accent',
      },
    },
    defaultVariants: { tone: 'default' },
  }
)

function Textarea({ className, tone, ...props }: React.ComponentProps<'textarea'> & VariantProps<typeof textareaVariants>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(textareaVariants({ tone }), className)}
      {...props}
    />
  )
}

export { Textarea }
