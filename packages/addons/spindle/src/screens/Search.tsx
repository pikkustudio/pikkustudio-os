import { useEffect, useState } from 'react'
import { Search as SearchIcon, Sparkles } from 'lucide-react'
import { Page } from '@pikku/pikkustudio-blocks/blocks/Page'
import { PageHead } from '@pikku/pikkustudio-blocks/blocks/PageHead'
import { Section } from '@pikku/pikkustudio-blocks/blocks/Section'
import { InlineAlert } from '@pikku/pikkustudio-blocks/blocks/InlineAlert'
import { RowCard, RowStack } from '@pikku/pikkustudio-blocks/blocks/RowCard'
import { StatusLine } from '@pikku/pikkustudio-blocks/blocks/StatusLine'
import { Button } from '@pikku/pikkustudio-blocks/ui/button'
import { Input } from '@pikku/pikkustudio-blocks/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@pikku/pikkustudio-blocks/ui/select'
import { useRpc, useBusy, where, type Hit, type Kb, type ScreenProps } from './shared.js'

type Citation = Hit & { n: number; title: string }
type Answer = { answer: string; unanswerable: boolean; citations: Citation[] }

export default function Search({ navigate }: ScreenProps) {
  const rpc = useRpc()
  const [kbs, setKbs] = useState<Kb[]>([])
  const [kbId, setKbId] = useState('all')
  const [query, setQuery] = useState('')
  const [hits, setHits] = useState<(Hit & { title?: string })[] | null>(null)
  const [answer, setAnswer] = useState<Answer | null>(null)
  useEffect(() => {
    void rpc.invoke('spindle:spindleListKnowledgeBases', {}).then((k) => setKbs(k.knowledgeBases))
  }, [rpc])
  const { busy, error, run } = useBusy(async () => {})

  const scope = kbId === 'all' ? undefined : kbId
  const search = () =>
    run('Searching', async () => {
      setAnswer(null)
      setHits((await rpc.invoke('spindle:spindleSearch', { query, kbId: scope })).hits)
    })
  const ask = () =>
    run('Reading your files for an answer', async () => {
      setHits(null)
      setAnswer(await rpc.invoke('spindle:spindleAsk', { question: query, kbId: scope }))
    })
  const ready = query.trim() !== '' && busy === null

  return (
    <div className="p-8">
      <Page gap="list">
        <PageHead crumb="Spindle" title="Search" text="Ask a question and get an answer with the page it came from, or search for a word." />
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (ready) void ask()
          }}
          className="flex flex-col gap-3 rounded-card border border-border bg-card p-4 shadow-card"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-64 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input shape="field" className="h-13 text-px17" style={{ paddingLeft: 48 }} placeholder="Ask a question, or search for a word" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <Select value={kbId} onValueChange={setKbId}>
              <SelectTrigger className="h-13 min-w-48 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Everything</SelectItem>
                {kbs.map((kb) => (
                  <SelectItem key={kb.kb_id} value={kb.kb_id}>
                    {kb.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" size="page" disabled={!ready}>
              <Sparkles /> Ask
            </Button>
            <Button type="button" variant="bordered" size="page" disabled={!ready} onClick={() => void search()}>
              <SearchIcon /> Just search
            </Button>
          </div>
        </form>

        {error ? <InlineAlert title="That did not work" body={error} /> : null}
        {busy ? <StatusLine tone="wait" text={`${busy}…`} /> : null}

        {answer ? (
          <Section title={answer.unanswerable ? 'Not in your files' : 'Answer'} sub={answer.unanswerable ? 'Nothing you have added says this, so Spindle will not guess.' : undefined}>
            <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-5 shadow-card">
              <p className="max-w-[68ch] text-[17px] leading-[1.55] text-pretty">{answer.answer}</p>
              {answer.citations.length > 0 ? (
                <ol className="flex flex-col gap-2 border-t border-border pt-3 text-[14px] text-ink-2">
                  {answer.citations.map((c) => (
                    <li key={c.n} className="flex items-center gap-2">
                      <b className="text-foreground">{c.n}</b>
                      <span className="flex-1">
                        {c.title}, {where(c)}
                      </span>
                      <Button size="compact" variant="bordered" onClick={() => navigate(`/files/${c.assetId}`)}>
                        Open
                      </Button>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          </Section>
        ) : null}

        {hits ? (
          <Section title={hits.length === 0 ? 'Nothing matched' : `${hits.length} ${hits.length === 1 ? 'place' : 'places'} found`}>
            <RowStack>
              {hits.map((h) => (
                <RowCard key={h.passageId} tile={<SearchIcon className="size-5" />} title={<span className="text-[16px] font-medium">{h.text.slice(0, 220)}</span>} caption={`${where(h)} · found by ${h.matchedBy}`}>
                  <Button size="compact" variant="bordered" onClick={() => navigate(`/files/${h.assetId}`)}>
                    Open file
                  </Button>
                </RowCard>
              ))}
            </RowStack>
          </Section>
        ) : null}
      </Page>
    </div>
  )
}
