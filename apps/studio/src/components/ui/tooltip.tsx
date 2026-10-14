import type { I18nProps } from '@pikkustudio/blocks/lib/i18n-props'
import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { useDirection } from '@radix-ui/react-direction'
import { cn } from '@/lib/utils'

const TooltipProvider = TooltipPrimitive.Provider
const Tooltip = TooltipPrimitive.Root
const TooltipTrigger = TooltipPrimitive.Trigger

// `side` also takes `start` / `end`, which follow the reading direction (Radix's own sides are physical).
type TooltipSide = React.ComponentProps<typeof TooltipPrimitive.Content>['side'] | 'start' | 'end'

function TooltipContent({ className, sideOffset = 4, side, ...props }: Omit<I18nProps<React.ComponentProps<typeof TooltipPrimitive.Content>>, 'side'> & { side?: TooltipSide }) {
  const rtl = useDirection() === 'rtl'
  const physical = side === 'start' ? (rtl ? 'right' : 'left') : side === 'end' ? (rtl ? 'left' : 'right') : side
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content data-slot="tooltip-content" side={physical} sideOffset={sideOffset} className={cn('z-50 w-fit rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background', className)} {...props} />
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
