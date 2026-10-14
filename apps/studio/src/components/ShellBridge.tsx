import { useContext, type ReactNode } from 'react'
import { ShellCtx } from '@pikkustudio/blocks/lib/shell'
import { useAskPikku } from '@/hooks/useAskPikku'
import { usePanel } from '@/hooks/usePanel'

export function ShellBridge({ children }: { children: ReactNode }) {
  const { ask } = useAskPikku()
  const { show } = usePanel()
  const outer = useContext(ShellCtx)
  if (outer) return <>{children}</>
  return (
    <ShellCtx.Provider
      value={{
        view: 'healthy',
        pending: [],
        paid: true,
        approve: () => {},
        say: ask,
        open: (id) => {
          if (id === 'chat' || id === 'updates' || id === 'workspace') show(id)
        },
        pikkuSays: () => {},
        attached: [],
        attach: () => {},
        detach: () => {},
        setPublish: () => {},
        openFind: () => {},
      }}
    >
      {children}
    </ShellCtx.Provider>
  )
}
