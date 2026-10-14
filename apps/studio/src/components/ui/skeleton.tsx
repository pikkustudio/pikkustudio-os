import type { I18nProps } from '@pikkustudio/blocks/lib/i18n-props'
import * as React from 'react'
import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: I18nProps<React.ComponentProps<'div'>>) {
  return <div data-slot="skeleton" className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />
}

export { Skeleton }
