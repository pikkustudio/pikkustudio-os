import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useEffect, useState } from 'react'
import { Search as SearchIcon, Sparkles } from 'lucide-react'
import { Page } from '@pikkustudio/blocks/blocks/Page'
import { PageHead } from '@pikkustudio/blocks/blocks/PageHead'
import { Section } from '@pikkustudio/blocks/blocks/Section'
import { InlineAlert } from '@pikkustudio/blocks/blocks/InlineAlert'
import { RowCard, RowStack } from '@pikkustudio/blocks/blocks/RowCard'
import { StatusLine } from '@pikkustudio/blocks/blocks/StatusLine'
import { Button } from '@pikkustudio/blocks/ui/button'
import { Input } from '@pikkustudio/blocks/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@pikkustudio/blocks/ui/select'
import { useRpc, useBusy, where, type Hit, type Kb, type ScreenProps } from './shared.js'

type Citation = Hit & { n: number; title: string }
type Answer = { answer: string; unanswerable: boolean; citations: Citation[] }

/** The start of a passage from a file, shown as the reason a place matched. */
const excerpt = (text: string) => {
  const cut = text.slice(0, 220)
  return asI18n(cut)
}

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
    run(m.spindle_shared__busy_searching(), async () => {
      setAnswer(null)
      setHits((await rpc.invoke('spindle:spindleSearch', { query, kbId: scope })).hits)
    })
  const ask = () =>
    run(m.spindle_shared__busy_reading_answer(), async () => {
      setHits(null)
      setAnswer(await rpc.invoke('spindle:spindleAsk', { question: query, kbId: scope }))
    })
  const ready = query.trim() !== '' && busy === null

  return (
    <div className="p-8">
      <Page gap="list">
        <PageHead crumb={m.spindle_search__spindle()} title={m.spindle_search__search()} text={m.spindle_search__ask_a_question_and_get_an()} />
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (ready) void ask()
          }}
          className="flex flex-col gap-3 rounded-card border border-border bg-card p-4 shadow-card"
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-64 flex-1">
              <SearchIcon className="pointer-events-none absolute top-1/2 start-4 size-5 -translate-y-1/2 text-muted-foreground" />
              <Input shape="field" className="h-13 text-px17" style={{ paddingInlineStart: 48 }} placeholder={m.spindle_search__ask_a_question_or_search_for()} value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <Select value={kbId} onValueChange={setKbId}>
              <SelectTrigger className="h-13 min-w-48 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{m.spindle_search__everything()}</SelectItem>
                {kbs.map((kb) => (
                  <SelectItem key={kb.kb_id} value={kb.kb_id}>
                    {asI18n(kb.name)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <Button type="submit" size="page" disabled={!ready}>
              <Sparkles />{m.spindle_search__ask()}
            </Button>
            <Button type="button" variant="bordered" size="page" disabled={!ready} onClick={() => void search()}>
              <SearchIcon />{m.spindle_search__just_search()}
            </Button>
          </div>
        </form>

        {error ? <InlineAlert title={m.spindle_search__that_did_not_work()} body={asI18n(error)} /> : null}
        {busy ? <StatusLine tone="wait" text={m.asset__text({ busy })} /> : null}

        {answer ? (
          <Section title={answer.unanswerable ? m.spindle_search__not_in_your_files() : m.spindle_search__answer()} sub={answer.unanswerable ? m.spindle_search__nothing_you_have_added_says_this() : undefined}>
            <div className="flex flex-col gap-4 rounded-card border border-border bg-card p-5 shadow-card">
              <p className="max-w-[68ch] text-[17px] leading-[1.55] text-pretty">{asI18n(answer.answer)}</p>
              {answer.citations.length > 0 ? (
                <ol className="flex flex-col gap-2 border-t border-border pt-3 text-[14px] text-ink-2">
                  {answer.citations.map((c) => (
                    <li key={c.n} className="flex items-center gap-2">
                      <b className="text-foreground">{c.n}</b>
                      <span className="flex-1">
                        {m.spindle_search__citation({ title: c.title, where: where(c) })}
                      </span>
                      <Button size="compact" variant="bordered" onClick={() => navigate(`/spindle/files/${c.assetId}`)}>
                        {m.spindle_search__open()}
                      </Button>
                    </li>
                  ))}
                </ol>
              ) : null}
            </div>
          </Section>
        ) : null}

        {hits ? (
          <Section title={hits.length === 0 ? m.spindle_search__nothing_matched() : m.spindle_search__place_count({ count: hits.length })}>
            <RowStack>
              {hits.map((h) => (
                <RowCard key={h.passageId} tile={<SearchIcon className="size-5" />} title={<span className="text-[16px] font-medium">{excerpt(h.text)}</span>} caption={m.spindle_search__found_by({ where: where(h), matchedBy: h.matchedBy })}>
                  <Button size="compact" variant="bordered" onClick={() => navigate(`/spindle/files/${h.assetId}`)}>
                    {m.spindle_search__open_file()}
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
