import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react'
import { Sparkles, Upload } from 'lucide-react'
import { Page } from '@pikku/pikkustudio-blocks/blocks/Page'
import { PageHead } from '@pikku/pikkustudio-blocks/blocks/PageHead'
import { EmptyState } from '@pikku/pikkustudio-blocks/blocks/EmptyState'
import { InlineAlert } from '@pikku/pikkustudio-blocks/blocks/InlineAlert'
import { RowCard, RowStack, Dot } from '@pikku/pikkustudio-blocks/blocks/RowCard'
import { StatusLine } from '@pikku/pikkustudio-blocks/blocks/StatusLine'
import { Button } from '@pikku/pikkustudio-blocks/ui/button'
import { useRpc, useBusy, kindOf, stateOf, type Asset, type ScreenProps } from './shared.js'

type Tool = { tool: string; status: 'ready' | 'missing' | 'unknown'; get: { brew?: string; apt?: string } | null }

export default function Library({ navigate }: ScreenProps) {
  const rpc = useRpc()
  const [assets, setAssets] = useState<Asset[]>([])
  const [tools, setTools] = useState<Tool[]>([])
  const [suggestions, setSuggestions] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const [unplaced, setUnplaced] = useState(false)
  const [dragging, setDragging] = useState(false)
  const file = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    const [a, p, t] = await Promise.all([
      rpc.invoke('spindle:spindleListAssets', { unplaced }),
      rpc.invoke('spindle:spindleListProposals', {}),
      rpc.invoke('spindle:spindleCheckTools', {}),
    ])
    setAssets(a.assets)
    setSuggestions(p.proposals.length)
    setTools(t.tools)
    setLoaded(true)
  }, [rpc, unplaced])
  useEffect(() => {
    void load()
  }, [load])
  const { busy, error, run } = useBusy(load)
  const reading = assets.some((a) => a.status === 'extracting')
  useEffect(() => {
    if (!reading) return
    const t = setInterval(() => void load(), 2000)
    return () => clearInterval(t)
  }, [reading, load])

  const upload = (files: File[]) =>
    run(files.length === 1 ? `Adding ${files[0]!.name}` : `Adding ${files.length} files`, async () => {
      for (const f of files) {
        const u = await rpc.invoke('spindle:spindleRequestAssetUpload', { fileName: f.name, mimeType: f.type, sizeBytes: f.size })
        const put = await fetch(u.uploadUrl, { method: u.uploadMethod, headers: u.uploadHeaders, body: f })
        if (!put.ok) throw new Error(`${f.name} did not upload (${put.status})`)
        const asset = await rpc.invoke('spindle:spindleRegisterAsset', { contentKey: u.contentKey, fileName: f.name, mimeType: f.type, sizeBytes: f.size })
        await rpc.invoke('spindle:spindleExtractAsset', { assetId: asset.asset_id })
      }
    })

  const drop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length) void upload(files)
  }

  const missing = tools.filter((t) => t.status === 'missing')
  const empty = loaded && assets.length === 0 && !unplaced

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
      onDrop={drop}
      className={`min-h-full p-8 transition-colors ${dragging ? 'bg-accent' : ''}`}
    >
      <Page gap="list">
        <PageHead crumb="Spindle" title="Library" text="Every file you have added. Spindle reads each one so you can search across all of them.">
          <input ref={file} type="file" multiple hidden onChange={(e) => e.target.files && void upload(Array.from(e.target.files))} />
          <Button size="page" onClick={() => file.current?.click()} disabled={busy !== null}>
            <Upload /> Add files
          </Button>
        </PageHead>

        {missing.length > 0 ? (
          <InlineAlert
            title="Spindle cannot read some files yet"
            body={`It needs ${missing.map((t) => t.tool).join(' and ')} on this computer. ${missing.map((t) => t.get?.brew ?? t.get?.apt).filter(Boolean).map((c) => `Install with: ${c}`).join('. ')}`}
          />
        ) : null}
        {error ? <InlineAlert title="That did not work" body={error} /> : null}
        {busy ? <StatusLine tone="wait" text={`${busy}…`} /> : null}
        {suggestions > 0 ? (
          <RowCard flag tile={<Sparkles className="size-5" />} title={`Spindle has ${suggestions} ${suggestions === 1 ? 'suggestion' : 'suggestions'} for grouping your files`} caption="Review them and decide which collections to make.">
            <Button size="compact" onClick={() => navigate('/suggestions')}>
              See suggestions
            </Button>
          </RowCard>
        ) : null}

        {empty ? (
          <EmptyState title="Start by adding your files" text="Drop documents, recordings, videos or images here, or choose them from your computer.">
            <Button size="page" onClick={() => file.current?.click()} disabled={busy !== null}>
              <Upload /> Choose files
            </Button>
          </EmptyState>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="filter" size="filter" aria-pressed={!unplaced} onClick={() => setUnplaced(false)}>
                All files
              </Button>
              <Button variant="filter" size="filter" aria-pressed={unplaced} onClick={() => setUnplaced(true)}>
                Not in a collection
              </Button>
            </div>
            {assets.length === 0 ? (
              <p className="text-ink-2">Every file is already in a collection.</p>
            ) : (
              <RowStack>
                {assets.map((a) => {
                  const kind = kindOf(a.kind)
                  const state = stateOf(a.status)
                  const Icon = kind.icon
                  return (
                    <RowCard key={a.asset_id} on={a.status === 'extracted'} flag={a.status === 'failed'} tile={<Icon className="size-5" />} title={a.title} caption={kind.label}>
                      <Dot tone={state.tone}>{state.label}</Dot>
                      {a.status === 'uploaded' || a.status === 'failed' ? (
                        <Button size="compact" variant="bordered" disabled={busy !== null} onClick={() => void run('Reading the file', async () => void (await rpc.invoke('spindle:spindleExtractAsset', { assetId: a.asset_id })))}>
                          {a.status === 'failed' ? 'Try again' : 'Read it'}
                        </Button>
                      ) : null}
                      <Button size="compact" variant="bordered" onClick={() => navigate(`/files/${a.asset_id}`)}>
                        Open
                      </Button>
                    </RowCard>
                  )
                })}
              </RowStack>
            )}
          </>
        )}
      </Page>
    </div>
  )
}
