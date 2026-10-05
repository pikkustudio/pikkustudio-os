import { m } from '@/i18n/messages'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

export function DevDetails({ children, title = m.dev_details__for_developers() }: { children: ReactNode; title?: string }) {
  return (
    <details className="group/dev rounded-[14px] border border-border bg-card">
      <summary className="flex cursor-pointer list-none items-center gap-2 rounded-[14px] px-4 py-3 text-[14px] font-bold text-ink-2 hover:bg-secondary hover:text-foreground">
        <ChevronRight className="size-4 transition-transform duration-140 group-open/dev:rotate-90" />
        {title}
      </summary>
      <div className="flex flex-col gap-2 px-4 pt-0.5 pb-4 text-[14px] text-ink-2">{children}</div>
    </details>
  )
}
