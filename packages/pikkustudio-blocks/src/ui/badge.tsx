import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:ring-3 focus-visible:ring-ring/50 [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground',
        destructive: 'border-transparent bg-destructive text-white',
        outline: 'text-foreground',
        pillOk: 'rounded-full border-0 bg-success-soft px-2.5 text-[12.5px] leading-[1.6] font-bold text-success-foreground [&>svg]:size-3.5',
        pillBad: 'rounded-full border-0 bg-destructive-soft px-2.5 text-[12.5px] leading-[1.6] font-bold text-destructive-foreground [&>svg]:size-3.5',
        pillMute: 'rounded-full border-0 bg-secondary px-2.5 text-[12.5px] leading-[1.6] font-bold text-muted-foreground [&>svg]:size-3.5',
        pillInfo: 'rounded-full border-0 bg-info-soft px-2.5 text-[12.5px] leading-[1.6] font-bold text-info-foreground [&>svg]:size-3.5',
        tag: 'rounded-full border-0 bg-secondary px-2.5 py-0.5 text-[12.5px] leading-[1.6] font-bold text-ink-2',
        ok: 'rounded-full border-transparent bg-success-soft px-2.5 py-0 text-[12.5px] leading-[1.6] font-bold text-success-foreground [&>svg]:size-3.5',
        warn: 'rounded-full border-[1.5px] border-warning bg-card px-2.25 py-0 text-[12.5px] leading-[1.6] font-bold text-warning-foreground [&>svg]:size-3.5',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'
  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
