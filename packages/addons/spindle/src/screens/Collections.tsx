import { useCallback, useEffect, useState } from 'react'
import { Folders, Plus } from 'lucide-react'
import { Page } from '@pikku/studio-console/blocks/Page'
import { PageHead } from '@pikku/studio-console/blocks/PageHead'
import { EmptyState } from '@pikku/studio-console/blocks/EmptyState'
import { InlineAlert } from '@pikku/studio-console/blocks/InlineAlert'
import { RowCard, RowStack } from '@pikku/studio-console/blocks/RowCard'
import { StatusLine } from '@pikku/studio-console/blocks/StatusLine'
import { Button } from '@pikku/studio-console/ui/button'
import { useRpc, useBusy, type Kb, type ScreenProps } from './shared.js'

export default function Collections({ navigate }: ScreenProps) {
  const rpc = useRpc()
  const [kbs, setKbs] = useState<Kb[]>([])
  const [loaded, setLoaded] = useState(false)
  const load = useCallback(async () => {
    setKbs((await rpc.invoke('spindle:spindleListKnowledgeBases', {})).knowledgeBases)
    setLoaded(true)
  }, [rpc])
  useEffect(() => {
    void load()
  }, [load])
  const { busy, error, run } = useBusy(load)

  return (
    <div className="p-8">
      <Page gap="list">
        <PageHead crumb="Spindle" title="Collections" text="Groups of files that belong together. Searching inside one keeps answers on topic.">
          <Button size="page" onClick={() => navigate('/collections/new')}>
            <Plus /> New collection
          </Button>
        </PageHead>
        {error ? <InlineAlert title="That did not work" body={error} /> : null}
        {busy ? <StatusLine tone="wait" text={`${busy}…`} /> : null}
        {loaded && kbs.length === 0 ? (
          <EmptyState title="No collections yet" text="Make one yourself, or let Spindle suggest groups from the files you have added.">
            <div className="flex flex-wrap gap-2.5">
              <Button size="page" onClick={() => navigate('/collections/new')}>
                <Plus /> New collection
              </Button>
              <Button size="page" variant="bordered" disabled={busy !== null} onClick={() => void run('Looking for groups', async () => { await rpc.invoke('spindle:spindleProposeKnowledgeBases', {}); navigate('/suggestions') })}>
                Suggest collections
              </Button>
            </div>
          </EmptyState>
        ) : (
          <RowStack>
            {kbs.map((kb) => (
              <RowCard key={kb.kb_id} on tile={<Folders className="size-5" />} title={kb.name} caption={`${kb.assetCount} ${kb.assetCount === 1 ? 'file' : 'files'}`} note={kb.description || undefined}>
                <Button size="compact" variant="bordered" onClick={() => navigate(`/collections/${kb.kb_id}`)}>
                  Open
                </Button>
              </RowCard>
            ))}
          </RowStack>
        )}
      </Page>
    </div>
  )
}
