import { useCallback, useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Page } from '@pikku/pikkustudio-blocks/blocks/Page'
import { PageHead } from '@pikku/pikkustudio-blocks/blocks/PageHead'
import { EmptyState } from '@pikku/pikkustudio-blocks/blocks/EmptyState'
import { InlineAlert } from '@pikku/pikkustudio-blocks/blocks/InlineAlert'
import { StatusLine } from '@pikku/pikkustudio-blocks/blocks/StatusLine'
import { Button } from '@pikku/pikkustudio-blocks/ui/button'
import { Input } from '@pikku/pikkustudio-blocks/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@pikku/pikkustudio-blocks/ui/select'
import { useRpc, useBusy, type Asset, type Kb, type ScreenProps } from './shared.js'

type Proposal = { proposal_id: string; name: string; description: string; reason: string; assets: { asset_id: string; fit: number; note: string }[] }

const fitWords = (fit: number) => (fit >= 0.8 ? 'Clearly belongs' : fit >= 0.6 ? 'Probably belongs' : 'Might belong')

function Card({ p, titles, kbs, busy, run, rpc }: { p: Proposal; titles: Map<string, string>; kbs: Kb[]; busy: boolean; run: ReturnType<typeof useBusy>['run']; rpc: ReturnType<typeof useRpc> }) {
  const [name, setName] = useState(p.name)
  const [into, setInto] = useState('')
  return (
    <article className="flex flex-col gap-4 rounded-card border border-warning bg-card p-5 shadow-card">
      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-semibold text-muted-foreground">Spindle suggests a collection</span>
        <p className="text-px15 text-ink-2 text-pretty">{p.reason}</p>
      </div>
      <ul className="flex flex-col gap-1.5">
        {p.assets.map((a) => (
          <li key={a.asset_id} className="flex flex-wrap items-baseline gap-x-3 text-[15px]">
            <b>{titles.get(a.asset_id) ?? 'A file'}</b>
            <span className="text-muted-foreground">{fitWords(a.fit)}</span>
            {a.note ? <span className="text-ink-2">{a.note}</span> : null}
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <Input shape="field" className="max-w-72" value={name} onChange={(e) => setName(e.target.value)} aria-label="Collection name" />
        <Button size="page" disabled={busy || name.trim() === ''} onClick={() => void run('Creating the collection', async () => void (await rpc.invoke('spindle:spindleAcceptProposal', { proposalId: p.proposal_id, name: name.trim() })))}>
          Make this collection
        </Button>
        <Button size="page" variant="ghost" disabled={busy} onClick={() => void run('Dismissing', async () => void (await rpc.invoke('spindle:spindleDismissProposal', { proposalId: p.proposal_id })))}>
          Not now
        </Button>
      </div>
      {kbs.length > 0 ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
          <span className="text-[14px] text-ink-2">Or add them to one you already have</span>
          <Select value={into} onValueChange={setInto}>
            <SelectTrigger className="h-10 min-w-56 rounded-xl">
              <SelectValue placeholder="Choose a collection" />
            </SelectTrigger>
            <SelectContent>
              {kbs.map((kb) => (
                <SelectItem key={kb.kb_id} value={kb.kb_id}>
                  {kb.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="compact" variant="bordered" disabled={busy || !into} onClick={() => void run('Adding the files', async () => void (await rpc.invoke('spindle:spindleRedirectProposal', { proposalId: p.proposal_id, kbId: into })))}>
            Add them
          </Button>
        </div>
      ) : null}
    </article>
  )
}

export default function Suggestions({ navigate }: ScreenProps) {
  const rpc = useRpc()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [titles, setTitles] = useState(new Map<string, string>())
  const [kbs, setKbs] = useState<Kb[]>([])
  const [loaded, setLoaded] = useState(false)
  const load = useCallback(async () => {
    const [p, a, k] = await Promise.all([
      rpc.invoke('spindle:spindleListProposals', {}),
      rpc.invoke('spindle:spindleListAssets', {}),
      rpc.invoke('spindle:spindleListKnowledgeBases', {}),
    ])
    setProposals(p.proposals)
    setTitles(new Map(a.assets.map((x: Asset) => [x.asset_id, x.title])))
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
        <PageHead crumb="Spindle" title="Suggestions" text="Files that fit no collection yet. Spindle groups the ones that belong together and you decide.">
          <Button size="page" variant="bordered" disabled={busy !== null} onClick={() => void run('Looking for groups', async () => void (await rpc.invoke('spindle:spindleProposeKnowledgeBases', {})))}>
            <Sparkles /> Look again
          </Button>
        </PageHead>
        {error ? <InlineAlert title="That did not work" body={error} /> : null}
        {busy ? <StatusLine tone="wait" text={`${busy}…`} /> : null}
        {loaded && proposals.length === 0 ? (
          <EmptyState title="Nothing to decide" text="Every file is in a collection, or Spindle has no new groups to suggest. Add more files and look again.">
            <Button size="page" variant="bordered" onClick={() => navigate('/collections')}>
              See collections
            </Button>
          </EmptyState>
        ) : (
          proposals.map((p) => <Card key={p.proposal_id} p={p} titles={titles} kbs={kbs} busy={busy !== null} run={run} rpc={rpc} />)
        )}
      </Page>
    </div>
  )
}
