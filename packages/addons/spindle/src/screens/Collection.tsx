import { useCallback, useEffect, useState } from 'react'
import { Folders } from 'lucide-react'
import { Page } from '@pikku/studio-console/blocks/Page'
import { PageHead } from '@pikku/studio-console/blocks/PageHead'
import { Section } from '@pikku/studio-console/blocks/Section'
import { InlineAlert } from '@pikku/studio-console/blocks/InlineAlert'
import { RowCard, RowStack, Dot } from '@pikku/studio-console/blocks/RowCard'
import { StatusLine } from '@pikku/studio-console/blocks/StatusLine'
import { Button } from '@pikku/studio-console/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@pikku/studio-console/ui/select'
import { useRpc, useBusy, kindOf, stateOf, type Asset, type ScreenProps } from './shared.js'

type Held = Asset & { source: string; reason: string | null }
type Detail = { kb: { kb_id: string; name: string; description: string }; assets: Held[] }

export default function Collection({ params, navigate }: ScreenProps) {
  const rpc = useRpc()
  const kbId = params.kbId!
  const [detail, setDetail] = useState<Detail | null>(null)
  const [others, setOthers] = useState<Asset[]>([])
  const [pick, setPick] = useState('')
  const [sure, setSure] = useState(false)
  const load = useCallback(async () => {
    const [d, all] = await Promise.all([rpc.invoke('spindle:spindleGetKnowledgeBase', { kbId }), rpc.invoke('spindle:spindleListAssets', {})])
    setDetail(d)
    const held = new Set(d.assets.map((a: Held) => a.asset_id))
    setOthers(all.assets.filter((a: Asset) => !held.has(a.asset_id)))
    setPick('')
  }, [rpc, kbId])
  useEffect(() => {
    void load()
  }, [load])
  const { busy, error, run } = useBusy(load)
  if (!detail) return <div className="p-8">{error ? <InlineAlert title="That did not work" body={error} /> : null}</div>

  return (
    <div className="p-8">
      <Page gap="list">
        <PageHead crumb="Collections" title={detail.kb.name} text={detail.kb.description || undefined}>
          {sure ? (
            <div className="flex gap-2">
              <Button size="page" variant="destructive" disabled={busy !== null} onClick={() => void run('Deleting', async () => { await rpc.invoke('spindle:spindleDeleteKnowledgeBase', { kbId }); navigate('/collections') })}>
                Yes, delete it
              </Button>
              <Button size="page" variant="bordered" onClick={() => setSure(false)}>
                Keep it
              </Button>
            </div>
          ) : (
            <Button size="page" variant="bordered" onClick={() => setSure(true)}>
              Delete collection
            </Button>
          )}
        </PageHead>
        {sure ? <p className="text-px15 text-ink-2">Your files stay in the library. Only the group is removed.</p> : null}
        {error ? <InlineAlert title="That did not work" body={error} /> : null}
        {busy ? <StatusLine tone="wait" text={`${busy}…`} /> : null}

        <Section title="Files in this collection">
          {detail.assets.length === 0 ? (
            <p className="text-ink-2">Nothing here yet. Add a file below.</p>
          ) : (
            <RowStack>
              {detail.assets.map((a) => {
                const Icon = kindOf(a.kind).icon
                const state = stateOf(a.status)
                return (
                  <RowCard key={a.asset_id} on tile={<Icon className="size-5" />} title={a.title} caption={a.source === 'workflow' && a.reason ? a.reason : kindOf(a.kind).label}>
                    <Dot tone={state.tone}>{state.label}</Dot>
                    <Button size="compact" variant="bordered" onClick={() => navigate(`/files/${a.asset_id}`)}>
                      Open
                    </Button>
                    <Button size="compact" variant="ghost" disabled={busy !== null} onClick={() => void run('Taking it out', async () => void (await rpc.invoke('spindle:spindlePlaceAsset', { kbId, assetId: a.asset_id, state: 'removed' })))}>
                      Take out
                    </Button>
                  </RowCard>
                )
              })}
            </RowStack>
          )}
        </Section>

        {others.length > 0 ? (
          <Section title="Add a file">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={pick} onValueChange={setPick}>
                <SelectTrigger className="h-11 min-w-72 rounded-xl">
                  <SelectValue placeholder="Choose a file" />
                </SelectTrigger>
                <SelectContent>
                  {others.map((a) => (
                    <SelectItem key={a.asset_id} value={a.asset_id}>
                      {a.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="page" disabled={!pick || busy !== null} onClick={() => void run('Adding', async () => void (await rpc.invoke('spindle:spindlePlaceAsset', { kbId, assetId: pick, state: 'placed' })))}>
                <Folders /> Add to collection
              </Button>
            </div>
          </Section>
        ) : null}
      </Page>
    </div>
  )
}
