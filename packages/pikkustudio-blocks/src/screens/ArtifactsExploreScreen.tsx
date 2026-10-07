import { useContext, useEffect, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Check, ChevronLeft, ChevronRight, Shuffle, SlidersHorizontal, Sparkles } from 'lucide-react'
import { Button } from '../ui/button'
import { PreviewBar } from '../blocks/PreviewBar'
import { EmptyState } from '../blocks/EmptyState'
import { CardsSkeleton, QueryState } from '../blocks/QueryState'
import { useChooseDirection } from '../lib/useChooseDirection'
import { ExploreDirection, ExploreDirections, moreIdeasMessage } from '../blocks/ExploreDirections'
import { useProjectKey } from '../lib/project'
import { useProjectQuery } from '../lib/projectRpc'
import { ShellCtx } from '../lib/shell'
import type { Artifact } from '../types/artifacts'
import type { Device } from '../types/designTypes'

function Directions({ directions, exploration }: { directions: Artifact[]; exploration: string }) {
  const q = useSearch({ strict: false }) as { screen?: 'tablet' | 'phone' }
  const navigate = useNavigate()
  const { say } = useContext(ShellCtx)
  const choose = useChooseDirection()
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
          all ? (
            <>
              <Button variant="bordered" size="compact" type="button" onClick={() => say(moreIdeasMessage('controlled', exploration))}>
                <Sparkles /> More like these
              </Button>
              <Button variant="bordered" size="compact" type="button" onClick={() => say(moreIdeasMessage('extreme', exploration))}>
                <Shuffle /> Something different
              </Button>
            </>
          ) : (
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
              <Button size="compact" type="button" onClick={() => choose(dir)}>
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

const latest = (list: Artifact[]) => {
  const groups = new Map<string, Artifact[]>()
  for (const a of list) groups.set(a.exploration ?? 'first', [...(groups.get(a.exploration ?? 'first') ?? []), a])
  return [...groups.entries()].sort((a, b) => Math.max(...b[1].map((x) => x.at)) - Math.max(...a[1].map((x) => x.at)))
}

function Explorations({ designs }: { designs: Artifact[] }) {
  const rounds = latest(designs)
  const [picked, setPicked] = useState<string>()
  const [id, items] = rounds.find(([k]) => k === picked) ?? rounds[0]!
  return (
    <div className="flex h-full flex-col gap-3">
      {rounds.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {rounds.map(([k, list], i) => (
            <Button key={k} variant={k === id ? 'default' : 'bordered'} size="compact" type="button" onClick={() => setPicked(k)}>
              {i === 0 ? 'Latest' : `Round ${rounds.length - i}`} · {list[0]?.mode === 'controlled' ? 'similar' : 'different'}
            </Button>
          ))}
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        <Directions key={id} exploration={id} directions={items.sort((a, b) => a.id.localeCompare(b.id))} />
      </div>
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
          <EmptyState layout="row" icon={Sparkles} title="No ideas yet" text="The directions show up here as soon as they are ready." />
        )
      }
    >
      {(data) => <Explorations designs={data.artifacts.filter((a) => a.kind === 'Design')} />}
    </QueryState>
  )
}
