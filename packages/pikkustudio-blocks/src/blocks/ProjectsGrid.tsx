import { m } from '@/i18n/messages'
import { useState } from 'react'
import { LayoutGrid, List, Search } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { EmptyState } from './EmptyState'
import { ProjectCard, type Project, type ProjectState } from './ProjectCard'
import { ProjectRow } from './ProjectRow'
import { Segmented } from './Segmented'

const groups: Record<string, ProjectState[]> = {
  all: ['running', 'progress', 'live', 'sketch', 'paused'],
  running: ['running', 'live'],
  progress: ['progress'],
  paused: ['paused'],
}

export function ProjectsGrid({ items, onRestore }: { items: Project[]; onRestore: (id: string) => void }) {
  const [filter, setFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [layout, setLayout] = useState('cards')

  const restore = onRestore
  const reset = () => {
    setFilter('all')
    setQuery('')
  }

  const q = query.trim().toLowerCase()
  const shown = items.filter((p) => groups[filter].includes(p.state) && (!q || `${p.name} ${p.summary}`.toLowerCase().includes(q)))

  return (
    <div className="@container flex flex-col gap-5">
      <div className="flex flex-col gap-3 @min-[620px]:flex-row @min-[620px]:items-center @min-[620px]:justify-between">
        <div className="relative w-full @min-[620px]:max-w-80">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground" />
          <Input shape="field" type="search" placeholder={m.projects_grid__search_your_projects()} aria-label={m.projects_grid__search_your_projects()} value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
        </div>
        <div className="flex items-center gap-2.5 overflow-x-auto">
          <Segmented label={m.projects_grid__how_to_show_them()} value={layout} onChange={setLayout} options={[['cards', <LayoutGrid key="c" className="size-4" />, false, 'Cards'], ['rows', <List key="r" className="size-4" />, false, 'List']]} />
          <Segmented
            label={m.projects_grid__show()}
            value={filter}
            onChange={setFilter}
            options={[
              ['all', 'All'],
              ['running', 'Running'],
              ['progress', m.projects_grid__in_progress()],
              ['paused', 'Paused'],
            ]}
          />
        </div>
      </div>
      {shown.length && layout === 'rows' ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {shown.map((p) => (
            <ProjectRow key={p.id} item={p} onRestore={() => restore(p.id)} />
          ))}
        </ul>
      ) : shown.length ? (
        <div className="grid grid-cols-1 gap-5 @min-[640px]:grid-cols-2 @min-[960px]:grid-cols-3">
          {shown.map((p) => (
            <ProjectCard key={p.id} item={p} onRestore={() => restore(p.id)} />
          ))}
        </div>
      ) : (
        <EmptyState layout="row" title={m.projects_grid__no_projects_match_that()} text={m.projects_grid__try_a_different_word()}>
          <Button variant="bordered" size="page" type="button" onClick={reset}>
            
            {m.projects_grid__show_all_projects()}
          </Button>
        </EmptyState>
      )}
    </div>
  )
}
