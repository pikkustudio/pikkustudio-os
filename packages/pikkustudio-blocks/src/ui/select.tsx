import * as React from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { cva, type VariantProps } from 'class-variance-authority'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '../lib/utils'

const selectTriggerVariants = cva(
  'flex cursor-pointer items-center justify-between gap-2 border-[1.5px] border-input bg-field text-px15 text-foreground outline-none hover:border-muted-foreground focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-accent data-[state=open]:border-primary data-[state=open]:ring-4 data-[state=open]:ring-accent',
  {
    variants: {
      shape: {
        field: 'h-11 w-full rounded-xl px-3',
        pill: 'h-10 w-auto rounded-full px-3 font-semibold',
      },
    },
    defaultVariants: { shape: 'field' },
  },
)

const Select = SelectPrimitive.Root

function SelectTrigger({ className, shape, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger> & VariantProps<typeof selectTriggerVariants>) {
  return (
    <SelectPrimitive.Trigger data-slot="select-trigger" className={cn(selectTriggerVariants({ shape }), className)} {...props}>
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectValue(props: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />
}

function SelectContent({ className, children, position = 'popper', ...props }: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        position={position}
        sideOffset={6}
        className={cn('z-50 max-h-72 min-w-(--radix-select-trigger-width) overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg', className)}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1.5">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn('relative flex cursor-pointer items-center rounded-lg py-2 pr-8 pl-3 text-px15 outline-none select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[state=checked]:font-bold', className)}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2.5 inline-flex">
        <Check className="size-4" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue }
