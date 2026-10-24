import type { I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useState } from 'react'
import { Search, Sparkles } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { EmptyState } from './EmptyState'
import { ArtifactRow } from './ArtifactRow'
import { PikkuDot } from './PikkuDot'
import type { Artifact } from '../types/artifacts'

const kinds = (): Array<[Artifact['kind'], I18nString]> => [
  ['Design', m.artifacts_gallery__designs()],
  ['Page', m.artifacts_gallery__pages()],
  ['Document', m.artifacts_gallery__documents()],
]

export function ArtifactsGallery({ view, items, onAsk }: { items: Artifact[]; view: 'healthy' | 'problem' | 'empty'; onAsk: (text: I18nString) => void }) {
  const [q, setQ] = useState('')
  const [kind, setKind] = useState('all')
  const term = q.trim().toLowerCase()

  if (!items.length)
    return (
      <EmptyState layout="row" icon={Sparkles} title={m.artifacts_gallery__nothing_has_been_made()} text={m.artifacts_gallery__designs_pages_and_documents()}>
        <Button variant="bordered" size="page" type="button" onClick={() => onAsk(m.artifacts_gallery__poster_request())}>
          <PikkuDot />
          
          {m.artifacts_gallery__ask_pikku_to_make()}
        </Button>
      </EmptyState>
    )

  const found = items.filter((a) => (kind === 'all' || a.kind === kind) && `${a.title} ${a.summary}`.toLowerCase().includes(term))
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger shape="pill" className="h-12 w-56 shrink-0 border-[1.5px] bg-field" aria-label={m.artifacts_gallery__kind()}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{m.artifacts_gallery__all_artifacts()}</SelectItem>
            {kinds().map(([id, text]) => (
              <SelectItem key={id} value={id}>
                {text}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative min-w-0 flex-1">
          <Search className="absolute top-1/2 start-3.5 size-5.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input type="search" shape="pill" className="h-12 border-[1.5px] border-input bg-field ps-10.5 text-px16 shadow-none md:text-px16" placeholder={m.artifacts_gallery__search_the_artifacts()} aria-label={m.artifacts_gallery__search_the_artifacts()} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      {term ? <p className="px-2 text-px14 text-muted-foreground">{found.length ? m.artifacts_gallery__found({ count: found.length }) : m.artifacts_gallery__nothing_matches_try_another()}</p> : null}
      {term ? (
        <ul className="@container/row m-0 flex list-none flex-col gap-2 p-0">
          {found.map((a) => (
            <ArtifactRow key={a.id} item={a} />
          ))}
        </ul>
      ) : (
        kinds().map(([id, text]) => {
          const list = found.filter((a) => a.kind === id)
          return list.length ? (
            <section key={id} className="flex flex-col gap-2">
              <h2 className="px-1 pt-2 text-px14 font-bold text-muted-foreground">{text}</h2>
              <ul className="@container/row m-0 flex list-none flex-col gap-2 p-0">
                {list.map((a) => (
                  <ArtifactRow key={a.id} item={a} />
                ))}
              </ul>
            </section>
          ) : null
        })
      )}
    </div>
  )
}
