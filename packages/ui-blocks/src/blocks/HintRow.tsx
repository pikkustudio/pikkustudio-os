import type { I18nNode } from '@pikku/react'
import type { ComponentType } from 'react'

export function HintRow({ icon: Icon, children }: { icon: ComponentType<{ className?: string }>; children: I18nNode }) {
  return (
    <div className="flex items-center gap-2.5 px-1 py-4.5 text-px15 text-ink-2">
      <Icon className="size-5.5 shrink-0 text-accent-foreground" />
      <span>{children}</span>
    </div>
  )
}
