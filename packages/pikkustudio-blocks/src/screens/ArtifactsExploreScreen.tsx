import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
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
        groups={[{ app: 'directions', label: m.artifacts_explore__directions(), pages: [{ id: 'all', name: m.artifacts_explore__all_ideas(), text: m.artifacts_explore__side_by_side() }, ...directions.map((d) => ({ id: d.id, name: asI18n(d.title), text: asI18n(d.summary) }))] }]}
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
                <Sparkles />{m.artifacts_explore__more_like_these()}
              </Button>
              <Button variant="bordered" size="compact" type="button" onClick={() => say(moreIdeasMessage('extreme', exploration))}>
                <Shuffle />{m.artifacts_explore__something_different()}
              </Button>
            </>
          ) : (
            <>
              <Button variant="bordered" size="compact" type="button" aria-label={m.artifacts_explore__previous_idea()} onClick={() => step(-1)}>
                <ChevronLeft className="rtl:-scale-x-100" />
              </Button>
              <Button variant="bordered" size="compact" type="button" aria-label={m.artifacts_explore__next_idea()} onClick={() => step(1)}>
                <ChevronRight className="rtl:-scale-x-100" />
              </Button>
              <Button variant="bordered" size="compact" type="button" onClick={() => say(m.artifacts_explore__change_say({ title: dir.title }))}>
                <SlidersHorizontal />{m.artifacts_explore__change_something()}
              </Button>
              <Button size="compact" type="button" onClick={() => choose(dir)}>
                <Check />{m.artifacts_explore__use_this_one()}
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
              {m.artifacts_explore__round_mode({ round: i === 0 ? m.artifacts_explore__latest() : m.artifacts_explore__round({ n: rounds.length - i }), mode: list[0]?.mode === 'controlled' ? m.artifacts_explore__similar() : m.artifacts_explore__different() })}
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
          <EmptyState layout="row" icon={Sparkles} title={m.artifacts_explore__no_ideas_title()} text={m.artifacts_explore__no_ideas_text()} />
        )
      }
    >
      {(data) => <Explorations designs={data.artifacts.filter((a) => a.kind === 'Design')} />}
    </QueryState>
  )
}
