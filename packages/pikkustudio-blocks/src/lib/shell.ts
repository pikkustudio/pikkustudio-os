import type { I18nString } from '@pikku/react'
import { createContext } from 'react'

export type View = 'healthy' | 'empty' | 'problem'
export type PanelId = 'chat' | 'updates' | 'changes' | 'workspace' | 'account'

export type PublishNote = { state: 'signin' | 'error' | 'live'; url: string; act: (a: 'publish' | 'signin') => void; ask: I18nString }

export const ShellCtx = createContext<{
  view: View
  pending: { changeId: string; title: I18nString; body: I18nString | null; status: string }[]
  paid: boolean
  approve: () => void
  say: (text: I18nString) => void
  open: (id: PanelId) => void
  pikkuSays: (text: I18nString) => void
  attached: I18nString[]
  attach: (label: I18nString) => void
  detach: (label: I18nString) => void
  setPublish: (p: PublishNote | null) => void
  openFind: () => void
}>(null as never)
