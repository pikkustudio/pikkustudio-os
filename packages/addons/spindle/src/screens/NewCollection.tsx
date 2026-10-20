import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useState } from 'react'
import { Page } from '@pikkustudio/blocks/blocks/Page'
import { PageHead } from '@pikkustudio/blocks/blocks/PageHead'
import { InlineAlert } from '@pikkustudio/blocks/blocks/InlineAlert'
import { Button } from '@pikkustudio/blocks/ui/button'
import { Input } from '@pikkustudio/blocks/ui/input'
import { useRpc, useBusy, type ScreenProps } from './shared.js'

export default function NewCollection({ navigate }: ScreenProps) {
  const rpc = useRpc()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const { busy, error, run } = useBusy(async () => {})

  return (
    <div className="p-8">
      <Page gap="list">
        <PageHead crumb={m.spindle_newcollection__collections()} title={m.spindle_newcollection__new_collection()} text={m.spindle_newcollection__give_it_a_name_you_can()} />
        {error ? <InlineAlert title={m.spindle_newcollection__that_did_not_work()} body={asI18n(error)} /> : null}
        <form
          className="flex max-w-xl flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            void run(m.spindle_shared__busy_creating(), async () => {
              const kb = await rpc.invoke('spindle:spindleCreateKnowledgeBase', { name: name.trim(), description: description.trim() })
              navigate(`/spindle/collections/${kb.kb_id}`)
            })
          }}
        >
          <label className="flex flex-col gap-1.5 text-[15px] font-semibold">
            {m.spindle_newcollection__name()}
            <Input shape="field" value={name} onChange={(e) => setName(e.target.value)} placeholder={m.spindle_newcollection__visitor_policies()} />
          </label>
          <label className="flex flex-col gap-1.5 text-[15px] font-semibold">
            {m.spindle_newcollection__what_belongs_in_it()}
            <Input shape="field" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={m.spindle_newcollection__booking_cancellation_and_opening_hours()} />
          </label>
          <div className="flex gap-2.5">
            <Button type="submit" size="page" disabled={busy !== null || name.trim() === ''}>
              {m.spindle_newcollection__create_collection()}
            </Button>
            <Button type="button" size="page" variant="bordered" onClick={() => navigate('/spindle/collections')}>
              {m.spindle_newcollection__cancel()}
            </Button>
          </div>
        </form>
      </Page>
    </div>
  )
}
