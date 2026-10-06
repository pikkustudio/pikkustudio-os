import { createContext } from 'react'

export type View = 'healthy' | 'empty' | 'problem'
export type PanelId = 'chat' | 'updates' | 'changes' | 'workspace' | 'account' | 'options'

export type PublishNote = { state: 'signin' | 'error' | 'live'; url: string; act: (a: 'publish' | 'signin') => void; ask: string }

export const ShellCtx = createContext<{
  view: View
  pending: { changeId: string; title: string; body: string | null; status: string }[]
  paid: boolean
  approve: () => void
  say: (text: string) => void
  open: (id: PanelId) => void
  pikkuSays: (text: string) => void
  attached: string[]
  attach: (label: string) => void
  detach: (label: string) => void
  setPublish: (p: PublishNote | null) => void
  openFind: () => void
}>(null as never)
