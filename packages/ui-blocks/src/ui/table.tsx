import type { I18nProps } from '../lib/i18n-props'
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../lib/utils'

function Table({ className, ...props }: I18nProps<React.ComponentProps<'table'>>) {
  return (
    <div data-slot="table-container" className="relative w-full overflow-x-auto">
      <table data-slot="table" className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  )
}

function TableHeader({ className, ...props }: I18nProps<React.ComponentProps<'thead'>>) {
  return <thead data-slot="table-header" className={cn('[&_tr]:border-b', className)} {...props} />
}

function TableBody({ className, ...props }: I18nProps<React.ComponentProps<'tbody'>>) {
  return <tbody data-slot="table-body" className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

function TableRow({ className, ...props }: I18nProps<React.ComponentProps<'tr'>>) {
  return <tr data-slot="table-row" className={cn('border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted', className)} {...props} />
}

function TableHead({ className, ...props }: I18nProps<React.ComponentProps<'th'>>) {
  return <th data-slot="table-head" className={cn('h-10 px-2 text-start align-middle font-medium whitespace-nowrap text-foreground', className)} {...props} />
}

const tableCellVariants = cva('p-2 align-middle whitespace-nowrap', {
  variants: {
    emphasis: {
      default: '',
      strong: 'font-medium',
      numeric: 'tabular-nums',
    },
  },
  defaultVariants: {
    emphasis: 'default',
  },
})

function TableCell({ className, emphasis, ...props }: I18nProps<React.ComponentProps<'td'>> & VariantProps<typeof tableCellVariants>) {
  return <td data-slot="table-cell" className={cn(tableCellVariants({ emphasis, className }))} {...props} />
}

function TableCaption({ className, ...props }: I18nProps<React.ComponentProps<'caption'>>) {
  return <caption data-slot="table-caption" className={cn('mt-4 text-sm text-muted-foreground', className)} {...props} />
}

export { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableCaption }
