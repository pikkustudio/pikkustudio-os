import type { I18nNode, I18nString } from '@pikku/react'
import { PinButton } from './PinButton'

export function SlimHead({ crumb, title, children }: { crumb?: I18nNode; title: I18nString; children?: I18nNode }) {
  return (
    <div data-testid="page-head" className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3">
      <div className="min-w-0">
        {crumb ? <div className="truncate text-[14px] font-semibold text-muted-foreground">{crumb}</div> : null}
        <h1 className="truncate text-[28px] leading-[1.15] font-bold tracking-[-0.01em]">{title}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {children}
        <PinButton />
      </div>
    </div>
  )
}
