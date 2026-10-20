import { m } from '@/i18n/messages'
import { useCallback, useEffect, useState } from 'react'
import { Folders } from 'lucide-react'
import { Page } from '@pikkustudio/blocks/blocks/Page'
import { PageHead } from '@pikkustudio/blocks/blocks/PageHead'
import { Section } from '@pikkustudio/blocks/blocks/Section'
import { InlineAlert } from '@pikkustudio/blocks/blocks/InlineAlert'
import { RowCard, RowStack, Dot } from '@pikkustudio/blocks/blocks/RowCard'
import { StatusLine } from '@pikkustudio/blocks/blocks/StatusLine'
import { Button } from '@pikkustudio/blocks/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@pikkustudio/blocks/ui/select'
import { useRpc, useBusy, kindOf, stateOf, where, STEP, type Kb, type ScreenProps } from './shared.js'
import { asI18n } from '@pikku/react'

type Detail = {
  asset: { asset_id: string; title: string; file_name: string; kind: string; status: string; size_bytes: number }
  steps: { step: string; status: string; error: string | null }[]
  passages: { passage_id: string; source: string; page: number | null; start_seconds: number | null; frame_at: number | null; text: string }[]
  collections: { kb_id: string; name: string; source: string; reason: string | null }[]
}

const size = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)
const STEP_TONE = { done: 'ok', running: 'warn', failed: 'bad' } as const
const STEP_WORD = { done: m.spindle_asset__step_done, running: m.spindle_asset__step_running, failed: m.spindle_asset__step_failed } as const
const SHOWN = 20
const STEP_ORDER = Object.keys(STEP)

export default function Asset({ params, navigate }: ScreenProps) {
  const rpc = useRpc()
  const assetId = params.assetId!
  const [d, setD] = useState<Detail | null>(null)
  const [kbs, setKbs] = useState<Kb[]>([])
  const [pick, setPick] = useState('')
  const [all, setAll] = useState(false)
  const load = useCallback(async () => {
    const [x, k] = await Promise.all([rpc.invoke('spindle:spindleGetAsset', { assetId }), rpc.invoke('spindle:spindleListKnowledgeBases', {})])
    setD(x)
    setKbs(k.knowledgeBases)
    setPick('')
  }, [rpc, assetId])
  useEffect(() => {
    void load()
  }, [load])
  const { busy, error, run } = useBusy(load)
  const reading = d?.asset.status === 'extracting'
  useEffect(() => {
    if (!reading) return
    const t = setInterval(() => void load(), 2000)
    return () => clearInterval(t)
  }, [reading, load])
  if (!d) return <div className="p-8">{error ? <InlineAlert title={m.spindle_asset__that_did_not_work()} body={asI18n(error)} /> : null}</div>

  const { asset } = d
  const kind = kindOf(asset.kind)
  const state = stateOf(asset.status)
  const held = new Set(d.collections.map((c) => c.kb_id))
  const free = kbs.filter((k) => !held.has(k.kb_id))
  const shown = all ? d.passages : d.passages.slice(0, SHOWN)

  return (
    <div className="p-8">
      <Page gap="list">
        <PageHead crumb={m.spindle_asset__library()} title={asI18n(asset.title)} text={m.spindle_asset__facts({ kind: kind.label(), file: asset.file_name, size: size(asset.size_bytes) })}>
          <div className="flex items-center gap-3">
            <Dot tone={state.tone}>{state.label()}</Dot>
            <Button size="page" variant="bordered" disabled={busy !== null} onClick={() => void run(m.spindle_shared__busy_reading_again(), async () => void (await rpc.invoke('spindle:spindleExtractAsset', { assetId })))}>
              {m.spindle_asset__read_it_again()}
            </Button>
          </div>
        </PageHead>
        {error ? <InlineAlert title={m.spindle_asset__that_did_not_work()} body={asI18n(error)} /> : null}
        {busy ? <StatusLine tone="wait" text={m.asset__text({ busy })} /> : null}

        <Section title={m.spindle_asset__collections()} sub={m.spindle_asset__collections_that_hold_this_file()}>
          {d.collections.length === 0 ? <p className="text-ink-2">{m.spindle_asset__it_is_not_in_any_collection()}</p> : null}
          <RowStack>
            {d.collections.map((c) => (
              <RowCard key={c.kb_id} on tile={<Folders className="size-5" />} title={asI18n(c.name)} caption={c.source === 'workflow' && c.reason ? asI18n(c.reason) : m.spindle_asset__added_by_you()}>
                <Button size="compact" variant="bordered" onClick={() => navigate(`/spindle/collections/${c.kb_id}`)}>
                  {m.spindle_asset__open()}
                </Button>
                <Button size="compact" variant="ghost" disabled={busy !== null} onClick={() => void run(m.spindle_shared__busy_taking_out(), async () => void (await rpc.invoke('spindle:spindlePlaceAsset', { kbId: c.kb_id, assetId, state: 'removed' })))}>
                  {m.spindle_asset__take_out()}
                </Button>
              </RowCard>
            ))}
          </RowStack>
          {free.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              <Select value={pick} onValueChange={setPick}>
                <SelectTrigger className="h-11 min-w-64 rounded-xl">
                  <SelectValue placeholder={m.spindle_asset__add_to_a_collection()} />
                </SelectTrigger>
                <SelectContent>
                  {free.map((k) => (
                    <SelectItem key={k.kb_id} value={k.kb_id}>
                      {asI18n(k.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="page" disabled={!pick || busy !== null} onClick={() => void run(m.spindle_shared__busy_adding(), async () => void (await rpc.invoke('spindle:spindlePlaceAsset', { kbId: pick, assetId, state: 'placed' })))}>
                {m.spindle_asset__add()}
              </Button>
            </div>
          ) : null}
        </Section>

        <Section title={m.spindle_asset__how_spindle_read_it()}>
          {d.steps.length === 0 ? <p className="text-ink-2">{m.spindle_asset__not_read_yet()}</p> : null}
          <RowStack>
            {[...d.steps].sort((a, b) => STEP_ORDER.indexOf(a.step) - STEP_ORDER.indexOf(b.step)).map((s, i) => (
              <RowCard key={s.step} flag={s.status === 'failed'} tile={<span className="text-[15px] font-bold">{i + 1}</span>} title={STEP[s.step as keyof typeof STEP]?.() ?? asI18n(s.step)} caption={s.error ? asI18n(s.error) : undefined}>
                <Dot tone={STEP_TONE[s.status as keyof typeof STEP_TONE] ?? 'quiet'}>{STEP_WORD[s.status as keyof typeof STEP_WORD]?.() ?? asI18n(s.status)}</Dot>
              </RowCard>
            ))}
          </RowStack>
        </Section>

        <Section title={m.spindle_asset__what_spindle_found()} sub={d.passages.length ? m.spindle_asset__passage_count({ count: d.passages.length }) : undefined}>
          {d.passages.length === 0 ? <p className="text-ink-2">{m.spindle_asset__nothing_yet_once_the_file_is()}</p> : null}
          <div className="flex flex-col gap-2">
            {shown.map((p) => (
              <div key={p.passage_id} className="flex gap-4 rounded-card border border-border bg-card px-4 py-3 shadow-card">
                <span className="w-24 shrink-0 text-[13px] font-semibold text-muted-foreground">{where(p)}</span>
                <p className="max-w-[72ch] text-[15px] leading-[1.55] text-pretty">{asI18n(p.text)}</p>
              </div>
            ))}
          </div>
          {d.passages.length > SHOWN && !all ? (
            <Button variant="bordered" size="page" className="self-start" onClick={() => setAll(true)}>
              {m.spindle_asset__show_all_count({ count: d.passages.length })}
            </Button>
          ) : null}
        </Section>
      </Page>
    </div>
  )
}
