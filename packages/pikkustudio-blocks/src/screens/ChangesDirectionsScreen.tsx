import { useNavigate, useSearch } from '@tanstack/react-router'
import { PageHead } from '../blocks/PageHead'
import { Segmented } from '../blocks/Segmented'
import { InboxDock, InboxMain } from '../directions-changes/A'
import { TimelineDock, TimelineMain } from '../directions-changes/B'
import { BoardDock, BoardMain } from '../directions-changes/C'
import { FocusDock, FocusMain } from '../directions-changes/D'

const WAYS = {
  a: { name: 'Inbox', line: 'Every change in one list, the open one on the right. Best for answering fast.', Main: InboxMain, Dock: InboxDock },
  b: { name: 'Timeline', line: 'The life of your app as a story, newest first. Best for seeing what happened and when.', Main: TimelineMain, Dock: TimelineDock },
  c: { name: 'Board', line: 'Bundles of changes moving left to right. Best for seeing the whole picture.', Main: BoardMain, Dock: BoardDock },
  d: { name: 'Focus', line: 'One decision at a time, before and after side by side. Best for approving with confidence.', Main: FocusMain, Dock: FocusDock },
} as const

export function ChangesDirectionsScreen() {
  const raw = useSearch({ strict: false }) as { d?: string }
  const d = (['a', 'b', 'c', 'd'].includes(String(raw.d)) ? raw.d : 'a') as keyof typeof WAYS
  const nav = useNavigate()
  const { Main, line } = WAYS[d]
  return (
    <div className="flex flex-col gap-6">
      <PageHead crumb="Changes" title="Changes" text={line}>
        <Segmented label="Direction" value={d} options={Object.entries(WAYS).map(([id, w]) => [id, `${id.toUpperCase()} · ${w.name}`])} onChange={(v) => nav({ to: '.', search: (p: Record<string, unknown>) => ({ ...p, d: v }) } as never)} />
      </PageHead>
      <div className="flex items-start gap-6">
        <Main />
      </div>
    </div>
  )
}
