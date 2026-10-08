import { m } from '@/i18n/messages'
import { useCallback, useEffect, useState } from 'react'
import { Folders } from 'lucide-react'
import { Page } from '@pikku/pikkustudio-blocks/blocks/Page'
import { PageHead } from '@pikku/pikkustudio-blocks/blocks/PageHead'
import { Section } from '@pikku/pikkustudio-blocks/blocks/Section'
import { InlineAlert } from '@pikku/pikkustudio-blocks/blocks/InlineAlert'
import { RowCard, RowStack, Dot } from '@pikku/pikkustudio-blocks/blocks/RowCard'
import { StatusLine } from '@pikku/pikkustudio-blocks/blocks/StatusLine'
import { Button } from '@pikku/pikkustudio-blocks/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@pikku/pikkustudio-blocks/ui/select'
import { useRpc, useBusy, kindOf, stateOf, type Asset, type ScreenProps } from './shared.js'
import { asI18n } from '@pikku/react'

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
  if (!detail) return <div className="p-8">{error ? <InlineAlert title={m.spindle_collection__that_did_not_work()} body={asI18n(error)} /> : null}</div>

  return (
    <div className="p-8">
      <Page gap="list">
        <PageHead crumb={m.spindle_collection__collections()} title={asI18n(detail.kb.name)} text={detail.kb.description ? asI18n(detail.kb.description) : undefined}>
          {sure ? (
            <div className="flex gap-2">
              <Button size="page" variant="destructive" disabled={busy !== null} onClick={() => void run(m.spindle_shared__busy_deleting(), async () => { await rpc.invoke('spindle:spindleDeleteKnowledgeBase', { kbId }); navigate('/collections') })}>
                {m.spindle_collection__yes_delete_it()}
              </Button>
              <Button size="page" variant="bordered" onClick={() => setSure(false)}>
                {m.spindle_collection__keep_it()}
              </Button>
            </div>
          ) : (
            <Button size="page" variant="bordered" onClick={() => setSure(true)}>
              {m.spindle_collection__delete_collection()}
            </Button>
          )}
        </PageHead>
        {sure ? <p className="text-px15 text-ink-2">{m.spindle_collection__your_files_stay_in_the_library()}</p> : null}
        {error ? <InlineAlert title={m.spindle_collection__that_did_not_work()} body={asI18n(error)} /> : null}
        {busy ? <StatusLine tone="wait" text={m.asset__text({ busy })} /> : null}

        <Section title={m.spindle_collection__files_in_this_collection()}>
          {detail.assets.length === 0 ? (
            <p className="text-ink-2">{m.spindle_collection__nothing_here_yet_add_a_file()}</p>
          ) : (
            <RowStack>
              {detail.assets.map((a) => {
                const Icon = kindOf(a.kind).icon
                const state = stateOf(a.status)
                return (
                  <RowCard key={a.asset_id} on tile={<Icon className="size-5" />} title={asI18n(a.title)} caption={a.source === 'workflow' && a.reason ? asI18n(a.reason) : kindOf(a.kind).label()}>
                    <Dot tone={state.tone}>{state.label()}</Dot>
                    <Button size="compact" variant="bordered" onClick={() => navigate(`/files/${a.asset_id}`)}>
                      {m.spindle_collection__open()}
                    </Button>
                    <Button size="compact" variant="ghost" disabled={busy !== null} onClick={() => void run(m.spindle_shared__busy_taking_out(), async () => void (await rpc.invoke('spindle:spindlePlaceAsset', { kbId, assetId: a.asset_id, state: 'removed' })))}>
                      {m.spindle_collection__take_out()}
                    </Button>
                  </RowCard>
                )
              })}
            </RowStack>
          )}
        </Section>

        {others.length > 0 ? (
          <Section title={m.spindle_collection__add_a_file()}>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={pick} onValueChange={setPick}>
                <SelectTrigger className="h-11 min-w-72 rounded-xl">
                  <SelectValue placeholder={m.spindle_collection__choose_a_file()} />
                </SelectTrigger>
                <SelectContent>
                  {others.map((a) => (
                    <SelectItem key={a.asset_id} value={a.asset_id}>
                      {asI18n(a.title)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="page" disabled={!pick || busy !== null} onClick={() => void run(m.spindle_shared__busy_adding(), async () => void (await rpc.invoke('spindle:spindlePlaceAsset', { kbId, assetId: pick, state: 'placed' })))}>
                <Folders />{m.spindle_collection__add_to_collection()}
              </Button>
            </div>
          </Section>
        ) : null}
      </Page>
    </div>
  )
}
