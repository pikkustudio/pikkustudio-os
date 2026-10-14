import type { I18nNode, I18nString } from '@pikku/react'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

export type PanelView = 'chat' | 'updates' | 'workspace' | { id: string; title: I18nString; body: I18nNode }

interface Panel {
  view: PanelView | null
  open: boolean
  pinned: boolean
  width: number | null
  show: (view: PanelView) => void
  close: (force?: boolean) => void
  togglePin: () => void
  setWidth: (px: number) => void
}

const Context = createContext<Panel | null>(null)

export const PANEL_MIN = 340
export const PANEL_MAX = 720

const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {}
}

export const clampPanel = (px: number) => Math.round(Math.max(PANEL_MIN, Math.min(PANEL_MAX, window.innerWidth * 0.5, px)))

export function PanelProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<PanelView | null>(null)
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [width, setWidthState] = useState<number | null>(null)
  const opener = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const w = Number(read('studio.panel.width'))
    if (w) setWidthState(clampPanel(w))
    const pin = read('studio.panel.pinned')
    if (pin === 'chat' || pin === 'updates' || pin === 'workspace') {
      setPinned(true)
      setView(pin)
      setOpen(true)
    }
  }, [])

  const show = useCallback((next: PanelView) => {
    if (document.activeElement instanceof HTMLElement && !document.activeElement.closest('[data-panel]'))
      opener.current = document.activeElement
    setView(next)
    setOpen(true)
    if (typeof next === 'string' && read('studio.panel.pinned')) write('studio.panel.pinned', next)
  }, [])

  const close = useCallback(
    (force = false) => {
      if (pinned && !force) return
      setOpen(false)
      setPinned(false)
      write('studio.panel.pinned', null)
      if (opener.current && document.contains(opener.current)) opener.current.focus({ preventScroll: true })
    },
    [pinned],
  )

  const togglePin = useCallback(() => {
    setPinned((was) => {
      write('studio.panel.pinned', was || typeof view !== 'string' ? null : view)
      return !was
    })
  }, [view])

  const setWidth = useCallback((px: number) => {
    const w = clampPanel(px)
    setWidthState(w)
    write('studio.panel.width', String(w))
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [close])

  return (
    <Context.Provider value={{ view, open, pinned, width, show, close, togglePin, setWidth }}>
      {children}
    </Context.Provider>
  )
}

export function usePanel() {
  const panel = useContext(Context)
  if (!panel) throw new Error('usePanel needs a PanelProvider')
  return panel
}
