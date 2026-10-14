import type { I18nProps } from '@pikkustudio/blocks/lib/i18n-props'
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 aria-busy:pointer-events-none aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        destructive: 'bg-destructive text-white shadow-xs hover:bg-destructive/90',
        outline: 'border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost: 'border-bold border-transparent text-ink-2 hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        hero: 'bg-hero-btn font-semibold text-hero-btn-ink shadow-xs hover:bg-hero-btn/90',
        bordered: 'border-bold border-input text-foreground hover:border-muted-foreground hover:bg-secondary',
        quiet: 'rounded-lg text-px145 font-bold text-accent-foreground hover:underline hover:underline-offset-3',
        quietMuted: 'rounded-lg text-px145 font-bold text-ink-2 hover:underline hover:underline-offset-3',
        heroGhost: 'border border-hero-ink/45 font-semibold text-hero-ink hover:bg-hero-ink/10',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 px-6 has-[>svg]:px-4',
        hero: 'h-14 px-8 text-base has-[>svg]:px-6',
        icon: 'size-9',
        page: 'h-11.5 px-5.5 text-px15 font-bold',
        pageTight: 'h-11.5 px-3.5 text-px15 font-bold',
        chip: 'h-10 px-4 text-px14 font-bold',
        compact: 'h-9.5 px-4 text-px14 font-bold',
        pageLg: 'h-14.5 px-7.5 text-px17 font-bold',
        link: 'h-auto gap-1.5 px-1 py-1.5',
        tile: 'h-auto flex-col gap-2 py-6',
        row: 'h-9 justify-start gap-3 px-4',
        profile: 'h-auto justify-start gap-3 px-3 py-2',
      },
      join: {
        none: '',
        start: 'rounded-e-none',
        end: 'rounded-s-none border-s border-primary-foreground/30',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      join: 'none',
    },
  }
)

function Button({
  className,
  variant,
  size,
  join,
  asChild = false,
  ...props
}: I18nProps<React.ComponentProps<'button'>> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : 'button'
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, join, className }))} {...props} />
}

export { Button, buttonVariants }
