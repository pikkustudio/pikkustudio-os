import { m } from '@/i18n/messages'
import { useCallback, useEffect, useState } from 'react'
import { Folders, Plus } from 'lucide-react'
import { Page } from '@pikkustudio/blocks/blocks/Page'
import { PageHead } from '@pikkustudio/blocks/blocks/PageHead'
import { EmptyState } from '@pikkustudio/blocks/blocks/EmptyState'
import { InlineAlert } from '@pikkustudio/blocks/blocks/InlineAlert'
import { RowCard, RowStack } from '@pikkustudio/blocks/blocks/RowCard'
import { StatusLine } from '@pikkustudio/blocks/blocks/StatusLine'
import { Button } from '@pikkustudio/blocks/ui/button'
import { useRpc, useBusy, type Kb, type ScreenProps } from './shared.js'
import { asI18n } from '@pikku/react'

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
        <PageHead crumb={m.spindle_collections__spindle()} title={m.spindle_collections__collections()} text={m.spindle_collections__groups_of_files_that_belong_together()}>
          <Button size="page" onClick={() => navigate('/spindle/collections/new')}>
            <Plus />{m.spindle_collections__new_collection()}
          </Button>
        </PageHead>
        {error ? <InlineAlert title={m.spindle_collections__that_did_not_work()} body={asI18n(error)} /> : null}
        {busy ? <StatusLine tone="wait" text={m.asset__text({ busy })} /> : null}
        {loaded && kbs.length === 0 ? (
          <EmptyState title={m.spindle_collections__no_collections_yet()} text={m.spindle_collections__make_one_yourself_or_let_spindle()}>
            <div className="flex flex-wrap gap-2.5">
              <Button size="page" onClick={() => navigate('/spindle/collections/new')}>
                <Plus />{m.spindle_collections__new_collection()}
              </Button>
              <Button size="page" variant="bordered" disabled={busy !== null} onClick={() => void run(m.spindle_shared__busy_looking_groups(), async () => { await rpc.invoke('spindle:spindleProposeKnowledgeBases', {}); navigate('/spindle/suggestions') })}>
                {m.spindle_collections__suggest_collections()}
              </Button>
            </div>
          </EmptyState>
        ) : (
          <RowStack>
            {kbs.map((kb) => (
              <RowCard key={kb.kb_id} on tile={<Folders className="size-5" />} title={asI18n(kb.name)} caption={m.spindle_collections__file_count({ count: kb.assetCount })} note={kb.description ? asI18n(kb.description) : undefined}>
                <Button size="compact" variant="bordered" onClick={() => navigate(`/spindle/collections/${kb.kb_id}`)}>
                  {m.spindle_collections__open()}
                </Button>
              </RowCard>
            ))}
          </RowStack>
        )}
      </Page>
    </div>
  )
}
