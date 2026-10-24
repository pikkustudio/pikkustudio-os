import type { I18nProps } from '../lib/i18n-props'
import * as React from 'react'
import { cn } from '../lib/utils'

function Switch({ checked, onCheckedChange, className, children, ...props }: Omit<I18nProps<React.ComponentProps<'button'>>, 'onChange'> & { checked: boolean; onCheckedChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      data-slot="switch"
      className={cn('group/switch inline-flex cursor-pointer items-center gap-2.5 text-px15 font-semibold', className)}
      {...props}
    >
      <span className="relative h-6.5 w-11 shrink-0 rounded-full bg-input transition-colors duration-140 group-aria-checked/switch:bg-primary">
        <span className="absolute top-0.75 start-0.75 size-5 rounded-full bg-white transition-transform duration-140 group-aria-checked/switch:translate-x-4.5 rtl:group-aria-checked/switch:-translate-x-4.5" />
      </span>
      {children}
    </button>
  )
}

export { Switch }
