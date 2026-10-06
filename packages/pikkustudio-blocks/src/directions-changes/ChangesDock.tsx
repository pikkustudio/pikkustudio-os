import { useSearch } from '@tanstack/react-router'
import { InboxDock } from './A'
import { TimelineDock } from './B'
import { BoardDock } from './C'
import { FocusDock } from './D'

const DOCKS = { a: InboxDock, b: TimelineDock, c: BoardDock, d: FocusDock }

export function ChangesDock() {
  const raw = useSearch({ strict: false }) as { d?: string }
  const Dock = DOCKS[(raw.d ?? 'a') as keyof typeof DOCKS] ?? InboxDock
  return <Dock />
}
