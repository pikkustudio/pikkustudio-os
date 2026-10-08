import type { I18nProps } from '../lib/i18n-props'
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

const inputVariants = cva(
  'flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-all outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
  {
    variants: {
      layout: {
        default: '',
        floating: 'pt-4',
      },
      shape: {
        default: '',
        pill: 'rounded-full px-4',
        field: 'h-11 rounded-xl border-[1.5px] bg-field px-3.5 text-px15 shadow-none hover:border-muted-foreground focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-accent md:text-px15',
      },
    },
    defaultVariants: {
      layout: 'default',
      shape: 'default',
    },
  }
)

function Input({ className, type, layout, shape, ...props }: I18nProps<React.ComponentProps<'input'>> & VariantProps<typeof inputVariants>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        inputVariants({ layout, shape }),
        shape === 'field' ? '' : 'focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        className
      )}
      {...props}
    />
  )
}

export { Input }
