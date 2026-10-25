import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { Check, ChevronLeft, ChevronRight, Shuffle, SlidersHorizontal, Sparkles } from 'lucide-react'
import { Button } from '../ui/button'
import { PreviewBar } from '../blocks/PreviewBar'
import { EmptyState } from '../blocks/EmptyState'
import { CardsSkeleton, QueryState } from '../blocks/QueryState'
import { useChooseDirection } from '../lib/useChooseDirection'
import { ExploreDirection, ExploreDirections, moreIdeasMessage } from '../blocks/ExploreDirections'
import { useProjectKey } from '../lib/project'
import { useProjectQuery } from '../lib/projectRpc'
import { keep } from '../lib/links'
import { newExplorationId } from '../lib/explorations'
import { ShellCtx } from '../lib/shell'
import type { Artifact } from '../types/artifacts'
import type { Device } from '../types/designTypes'

function Directions({ directions, exploration, dirId }: { directions: Artifact[]; exploration: string; dirId: string }) {
  const q = useSearch({ strict: false }) as { screen?: 'tablet' | 'phone' }
  const navigate = useNavigate()
  const { say } = useContext(ShellCtx)
  const choose = useChooseDirection()
  const [reloadKey, setReloadKey] = useState(0)
  const device: Device = q.screen ?? 'computer'
  const all = dirId === 'all' || !directions.some((d) => d.id === dirId)
  const dir = directions.find((d) => d.id === dirId) ?? directions[0]!
  const setDirId = (id: string) => navigate(id === 'all' ? { ...keep, to: '/artifacts/explore/$uid', params: { uid: exploration } } : { ...keep, to: '/artifacts/explore/$uid/$id', params: { uid: exploration, id } })
  const askMore = (mode: 'controlled' | 'extreme') => {
    const id = newExplorationId()
    say(moreIdeasMessage(mode, exploration, id))
    navigate({ ...keep, to: '/artifacts/explore/$uid', params: { uid: id } })
  }
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
              <Button variant="bordered" size="compact" type="button" onClick={() => askMore('controlled')}>
                <Sparkles />{m.artifacts_explore__more_like_these()}
              </Button>
              <Button variant="bordered" size="compact" type="button" onClick={() => askMore('extreme')}>
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

export const explorationOf = (a: Artifact) => a.exploration ?? 'first'

export function ArtifactsExploreScreen() {
  const key = useProjectKey()
  const { uid = 'first', id = 'all' } = useParams({ strict: false }) as { uid?: string; id?: string }
  const artifacts = useProjectQuery<{ artifacts: Artifact[] }>(key, 'console:listArtifacts', null, { refetchInterval: 4000 })
  return (
    <QueryState
      query={artifacts}
      skeleton={<CardsSkeleton count={3} />}
      empty={(data) =>
        data.artifacts.some((a) => a.kind === 'Design' && explorationOf(a) === uid) ? null : (
          <EmptyState layout="row" icon={Sparkles} title={m.artifacts_explore__no_ideas_title()} text={m.artifacts_explore__no_ideas_text()} />
        )
      }
    >
      {(data) => <Directions key={uid} exploration={uid} dirId={id} directions={data.artifacts.filter((a) => a.kind === 'Design' && explorationOf(a) === uid).sort((a, b) => a.id.localeCompare(b.id))} />}
    </QueryState>
  )
}
