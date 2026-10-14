import type { I18nNode } from '@pikku/react'
import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'

export function Shell({
  collapsed,
  rail,
  dock,
  float,
  panel,
  panelOpen = false,
  panelWidth = null,
  children,
}: {
  collapsed: boolean
  rail: I18nNode
  dock?: I18nNode
  float?: I18nNode
  panel?: I18nNode
  panelOpen?: boolean
  panelWidth?: number | null
  children: I18nNode
}) {
  return (
    <div
      className="relative h-svh w-full overflow-hidden bg-background panel-w"
      style={panelWidth ? ({ '--panel-w': `${panelWidth}px` } as CSSProperties) : undefined}
    >
      <div className="flex h-full min-h-0 overflow-hidden">
        <aside
          className={cn(
            'flex shrink-0 flex-col gap-5 overflow-y-auto border-e bg-muted px-4 py-5',
            collapsed ? 'w-20 items-center' : 'w-63',
          )}
        >
          {rail}
        </aside>
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col transition-all duration-420 ease-spring',
            panelOpen && 'pe-(--panel-w)',
          )}
        >
          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
          {dock ? <div className="shrink-0 border-t bg-background">{dock}</div> : null}
        </div>
      </div>
      {float ? (
        <div
          className={cn(
            'absolute bottom-6 z-10 flex flex-col items-end gap-4 transition-all duration-420 ease-spring',
            panelOpen ? 'end-above-panel' : 'end-6',
          )}
        >
          {float}
        </div>
      ) : null}
      {panel}
    </div>
  )
}
