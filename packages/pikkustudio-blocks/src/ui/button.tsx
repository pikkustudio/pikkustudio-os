import type { I18nProps } from '../lib/i18n-props'
import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 aria-busy:pointer-events-none aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-xs hover:bg-primary/90',
        destructive: 'bg-destructive text-white shadow-xs hover:bg-destructive/90',
        outline: 'border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80',
        ghost: 'border-[1.5px] border-transparent text-ink-2 hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        hero: 'border-[1.5px] border-transparent bg-hero-btn font-semibold text-hero-btn-ink shadow-xs hover:bg-hero-btn/90',
        bordered: 'border-[1.5px] border-input text-foreground hover:border-muted-foreground hover:bg-secondary',
        selected: 'border-[1.5px] border-primary bg-accent text-accent-foreground',
        quiet: 'rounded-sm text-px145 font-bold text-accent-foreground hover:underline hover:underline-offset-3',
        quietMuted: 'rounded-sm text-px145 font-bold text-ink-2 hover:underline hover:underline-offset-3',
        heroChoice: 'border-[1.5px] border-hero-ink/45 font-bold text-hero-ink hover:bg-hero-ink/16 active:scale-97 aria-checked:border-hero-ink aria-checked:bg-hero-ink aria-checked:text-hero',
        heroGhost: 'border border-hero-ink/45 font-semibold text-hero-ink hover:bg-hero-ink/10',
        filter: 'border-[1.5px] border-input bg-card font-bold hover:bg-secondary aria-pressed:border-foreground aria-pressed:bg-foreground aria-pressed:text-background',
        segment: 'group font-semibold text-ink-2 hover:text-foreground aria-pressed:bg-card aria-pressed:text-foreground aria-pressed:shadow-card aria-pressed:ring-1 aria-pressed:ring-border',
        bar: 'border-[1.5px] border-input bg-card text-ink-2 hover:border-muted-foreground hover:bg-secondary hover:text-foreground',
        picker: 'border-[1.5px] border-input bg-card font-bold text-foreground shadow-xs hover:border-muted-foreground hover:bg-secondary aria-expanded:border-primary aria-expanded:bg-accent',
        back: 'font-bold text-accent-foreground hover:bg-accent',
        soft: 'border-2 border-transparent font-bold text-ink-2 hover:bg-secondary hover:text-foreground active:bg-surface-3',
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
        chipSm: 'h-8.5 gap-2 px-4 text-px14 font-bold',
        round: 'size-10.5 p-0',
        compact: 'h-9.5 px-4 text-px14 font-bold',
        compactTight: 'h-9.5 px-3.5 text-px14 font-bold',
        textTight: 'h-auto px-3.5 text-px14 font-bold',
        pageLg: 'h-14.5 px-7.5 text-px17 font-bold',
        filter: 'h-8.5 px-3 text-[13.5px]',
        segment: 'h-8.5 px-3.5 text-px14',
        bar: 'size-10 p-0',
        picker: 'h-10 max-w-full min-w-0 gap-2.5 px-4.5 text-px15',
        back: 'h-auto gap-2 py-1.5 pe-2.5 ps-1 text-px16',
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
