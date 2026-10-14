import { createContext, useContext, useState, type ReactNode } from 'react'
import { usePanel } from './usePanel'

interface AskPikku {
  draft: string
  ask: (text: string) => void
}

const Context = createContext<AskPikku>({ draft: '', ask: () => {} })

export function AskPikkuProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState('')
  const { show } = usePanel()
  const ask = (text: string) => {
    setDraft(text)
    show('chat')
  }
  return <Context.Provider value={{ draft, ask }}>{children}</Context.Provider>
}

export const useAskPikku = () => useContext(Context)
