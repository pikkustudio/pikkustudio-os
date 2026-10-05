import { useContext, useEffect, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Check, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { Button } from '../ui/button'
import { PreviewBar } from '../blocks/PreviewBar'
import { EmptyState } from '../blocks/EmptyState'
import { CardsSkeleton, QueryState } from '../blocks/QueryState'
import { ExploreDirection, ExploreDirections, chooseMessage } from '../blocks/ExploreDirections'
import { useProjectKey } from '../lib/project'
import { useProjectQuery } from '../lib/projectRpc'
import { ShellCtx } from '../lib/shell'
import type { Artifact } from '../types/artifacts'
import type { Device } from '../types/designTypes'

function Directions({ directions }: { directions: Artifact[] }) {
  const q = useSearch({ strict: false }) as { screen?: 'tablet' | 'phone' }
  const navigate = useNavigate()
  const { say } = useContext(ShellCtx)
  const [dirId, setDirId] = useState('all')
  const [reloadKey, setReloadKey] = useState(0)
  const device: Device = q.screen ?? 'computer'
  const all = dirId === 'all'
  const dir = directions.find((d) => d.id === dirId) ?? directions[0]!
  const set = (patch: Record<string, unknown>) => navigate({ to: '.', search: ((prev: object) => ({ ...prev, ...patch })) as never, replace: true })
  const step = (by: number) => {
    const at = directions.indexOf(dir)
    setDirId(directions[(at + by + directions.length) % directions.length]!.id)
  }
  useEffect(() => {
    if (all) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target?.closest('input, textarea, select, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'ArrowRight') step(1)
      else if (e.key === 'ArrowLeft') step(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [all, dirId, directions])
  return (
    <div className="flex h-full flex-col gap-3">
      <PreviewBar
        app="directions"
        page={all ? 'all' : dir.id}
        groups={[{ app: 'directions', label: 'Directions', pages: [{ id: 'all', name: 'All ideas', text: 'Side by side' }, ...directions.map((d) => ({ id: d.id, name: d.title, text: d.summary }))] }]}
        device={device}
        tools={[]}
        tool=""
        onPick={(_a, p) => setDirId(p)}
        onDevice={(d) => set({ screen: d === 'computer' ? undefined : d })}
        onTool={() => {}}
        onReload={() => setReloadKey((k) => k + 1)}
        actions={
          all ? null : (
            <>
              <Button variant="bordered" size="compact" type="button" aria-label="Previous idea" onClick={() => step(-1)}>
                <ChevronLeft />
              </Button>
              <Button variant="bordered" size="compact" type="button" aria-label="Next idea" onClick={() => step(1)}>
                <ChevronRight />
              </Button>
              <Button variant="bordered" size="compact" type="button" onClick={() => say(`Change something in "${dir.title}": `)}>
                <SlidersHorizontal /> Change something
              </Button>
              <Button size="compact" type="button" onClick={() => say(chooseMessage(dir.title))}>
                <Check /> Use this one
              </Button>
            </>
          )
        }
      />
      {all ? <ExploreDirections directions={directions} onOpen={setDirId} /> : <ExploreDirection direction={dir} device={device} reloadKey={reloadKey} />}
    </div>
  )
}

export function ArtifactsExploreScreen() {
  const key = useProjectKey()
  const artifacts = useProjectQuery<{ artifacts: Artifact[] }>(key, 'console:listArtifacts', null, { refetchInterval: 4000 })
  return (
    <QueryState
      query={artifacts}
      skeleton={<CardsSkeleton count={3} />}
      empty={(data) =>
        data.artifacts.some((a) => a.kind === 'Design') ? null : (
          <EmptyState layout="row" title="No ideas yet" text="The directions show up here as soon as they are ready." />
        )
      }
    >
      {(data) => <Directions directions={data.artifacts.filter((a) => a.kind === 'Design').sort((a, b) => a.id.localeCompare(b.id))} />}
    </QueryState>
  )
}
