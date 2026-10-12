import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useCallback, useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Page } from '@pikkustudio/blocks/blocks/Page'
import { PageHead } from '@pikkustudio/blocks/blocks/PageHead'
import { EmptyState } from '@pikkustudio/blocks/blocks/EmptyState'
import { InlineAlert } from '@pikkustudio/blocks/blocks/InlineAlert'
import { StatusLine } from '@pikkustudio/blocks/blocks/StatusLine'
import { Button } from '@pikkustudio/blocks/ui/button'
import { Input } from '@pikkustudio/blocks/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@pikkustudio/blocks/ui/select'
import { useRpc, useBusy, type Asset, type Kb, type ScreenProps } from './shared.js'

type Proposal = { proposal_id: string; name: string; description: string; reason: string; assets: { asset_id: string; fit: number; note: string }[] }

const fitWords = (fit: number) => (fit >= 0.8 ? m.spindle_suggestions__fit_clear() : fit >= 0.6 ? m.spindle_suggestions__fit_probable() : m.spindle_suggestions__fit_maybe())

function Card({ p, titles, kbs, busy, run, rpc }: { p: Proposal; titles: Map<string, I18nString>; kbs: Kb[]; busy: boolean; run: ReturnType<typeof useBusy>['run']; rpc: ReturnType<typeof useRpc> }) {
  const [name, setName] = useState(p.name)
  const [into, setInto] = useState('')
  return (
    <article className="flex flex-col gap-4 rounded-card border border-warning bg-card p-5 shadow-card">
      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-semibold text-muted-foreground">{m.spindle_suggestions__spindle_suggests_a_collection()}</span>
        <p className="text-px15 text-ink-2 text-pretty">{asI18n(p.reason)}</p>
      </div>
      <ul className="flex flex-col gap-1.5">
        {p.assets.map((a) => (
          <li key={a.asset_id} className="flex flex-wrap items-baseline gap-x-3 text-[15px]">
            <b>{titles.get(a.asset_id) ?? m.spindle_suggestions__a_file()}</b>
            <span className="text-muted-foreground">{fitWords(a.fit)}</span>
            {a.note ? <span className="text-ink-2">{asI18n(a.note)}</span> : null}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <Input shape="field" className="max-w-72" value={name} onChange={(e) => setName(e.target.value)} aria-label={m.spindle_suggestions__collection_name()} />
        <Button size="page" disabled={busy || name.trim() === ''} onClick={() => void run(m.spindle_shared__busy_creating_collection(), async () => void (await rpc.invoke('spindle:spindleAcceptProposal', { proposalId: p.proposal_id, name: name.trim() })))}>
          {m.spindle_suggestions__make_this_collection()}
        </Button>
        <Button size="page" variant="ghost" disabled={busy} onClick={() => void run(m.spindle_shared__busy_dismissing(), async () => void (await rpc.invoke('spindle:spindleDismissProposal', { proposalId: p.proposal_id })))}>
          {m.spindle_suggestions__not_now()}
        </Button>
      </div>
      {kbs.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <span className="text-[14px] text-ink-2">{m.spindle_suggestions__or_add_them_to_one_you()}</span>
          <Select value={into} onValueChange={setInto}>
            <SelectTrigger className="h-10 min-w-56 rounded-xl">
              <SelectValue placeholder={m.spindle_suggestions__choose_a_collection()} />
            </SelectTrigger>
            <SelectContent>
              {kbs.map((kb) => (
                <SelectItem key={kb.kb_id} value={kb.kb_id}>
                  {asI18n(kb.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="compact" variant="bordered" disabled={busy || !into} onClick={() => void run(m.spindle_shared__busy_adding_files(), async () => void (await rpc.invoke('spindle:spindleRedirectProposal', { proposalId: p.proposal_id, kbId: into })))}>
            {m.spindle_suggestions__add_them()}
          </Button>
        </div>
      ) : null}
    </article>
  )
}

export default function Suggestions({ navigate }: ScreenProps) {
  const rpc = useRpc()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [titles, setTitles] = useState(new Map<string, I18nString>())
  const [kbs, setKbs] = useState<Kb[]>([])
  const [loaded, setLoaded] = useState(false)
  const load = useCallback(async () => {
    const [p, a, k] = await Promise.all([
      rpc.invoke('spindle:spindleListProposals', {}),
      rpc.invoke('spindle:spindleListAssets', {}),
      rpc.invoke('spindle:spindleListKnowledgeBases', {}),
    ])
    setProposals(p.proposals)
    setTitles(new Map(a.assets.map((x: Asset) => [x.asset_id, asI18n(x.title)])))
    setKbs(k.knowledgeBases)
    setLoaded(true)
  }, [rpc])
  useEffect(() => {
    void load()
  }, [load])
  const { busy, error, run } = useBusy(load)

  return (
    <div className="p-8">
      <Page gap="list">
        <PageHead crumb={m.spindle_suggestions__spindle()} title={m.spindle_suggestions__suggestions()} text={m.spindle_suggestions__files_that_fit_no_collection_yet()}>
          <Button size="page" variant="bordered" disabled={busy !== null} onClick={() => void run(m.spindle_shared__busy_looking_groups(), async () => void (await rpc.invoke('spindle:spindleProposeKnowledgeBases', {})))}>
            <Sparkles />{m.spindle_suggestions__look_again()}
          </Button>
        </PageHead>
        {error ? <InlineAlert title={m.spindle_suggestions__that_did_not_work()} body={asI18n(error)} /> : null}
        {busy ? <StatusLine tone="wait" text={m.asset__text({ busy })} /> : null}
        {loaded && proposals.length === 0 ? (
          <EmptyState title={m.spindle_suggestions__nothing_to_decide()} text={m.spindle_suggestions__every_file_is_in_a_collection()}>
            <Button size="page" variant="bordered" onClick={() => navigate('/collections')}>
              {m.spindle_suggestions__see_collections()}
            </Button>
          </EmptyState>
        ) : (
          proposals.map((p) => <Card key={p.proposal_id} p={p} titles={titles} kbs={kbs} busy={busy !== null} run={run} rpc={rpc} />)
        )}
      </Page>
    </div>
  )
}
