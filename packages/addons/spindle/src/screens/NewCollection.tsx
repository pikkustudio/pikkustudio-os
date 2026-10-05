import { useState } from 'react'
import { Page } from '@pikku/pikkustudio-blocks/blocks/Page'
import { PageHead } from '@pikku/pikkustudio-blocks/blocks/PageHead'
import { InlineAlert } from '@pikku/pikkustudio-blocks/blocks/InlineAlert'
import { Button } from '@pikku/pikkustudio-blocks/ui/button'
import { Input } from '@pikku/pikkustudio-blocks/ui/input'
import { useRpc, useBusy, type ScreenProps } from './shared.js'

export default function NewCollection({ navigate }: ScreenProps) {
  const rpc = useRpc()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const { busy, error, run } = useBusy(async () => {})

  return (
    <div className="p-8">
      <Page gap="list">
        <PageHead crumb="Collections" title="New collection" text="Give it a name. You can add files to it afterwards from any file." />
        {error ? <InlineAlert title="That did not work" body={error} /> : null}
        <form
          className="flex max-w-xl flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            void run('Creating', async () => {
              const kb = await rpc.invoke('spindle:spindleCreateKnowledgeBase', { name: name.trim(), description: description.trim() })
              navigate(`/collections/${kb.kb_id}`)
            })
          }}
        >
          <label className="flex flex-col gap-1.5 text-[15px] font-semibold">
            Name
            <Input shape="field" value={name} onChange={(e) => setName(e.target.value)} placeholder="Visitor policies" />
          </label>
          <label className="flex flex-col gap-1.5 text-[15px] font-semibold">
            What belongs in it
            <Input shape="field" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Booking, cancellation and opening hours" />
          </label>
          <div className="flex gap-2.5">
            <Button type="submit" size="page" disabled={busy !== null || name.trim() === ''}>
              Create collection
            </Button>
            <Button type="button" size="page" variant="bordered" onClick={() => navigate('/collections')}>
              Cancel
            </Button>
          </div>
        </form>
      </Page>
    </div>
  )
}
