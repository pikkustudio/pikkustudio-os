import { m } from '@/i18n/messages'
import { useContext } from 'react'
import { Button } from '../ui/button'
import { useProjectKey, useProjectName } from '../lib/project'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { EmptyState } from '../blocks/EmptyState'
import { Rocket } from 'lucide-react'
import { PageHead } from '../blocks/PageHead'
import { PublishHosts } from '../blocks/PublishHosts'
import { useKeyedSlot } from '../lib/studio-slots'
import { ShellCtx } from '../lib/shell'


// The panel an addon gives a publish target it brings; a target nobody draws a panel for shows nothing here.
function PublishTarget({ id }: { id: string }) {
  const Target = useKeyedSlot('publish.target', id)
  return <Target />
}

export function PublishScreen() {
  const projectName = useProjectName()
  const key = useProjectKey()
  const { view, open } = useContext(ShellCtx)
  const targets = Object.keys(usePikkuQuery('studio:publishOptions', { key }, { enabled: !!key }).data?.targets ?? {})
  return (
    <div className="mx-auto flex max-w-[1160px] flex-col gap-7.5 @min-[1700px]/app:max-w-[1380px]">
      <PageHead
        size="lead"
        crumb={projectName}
        title={m.publish_screen__title()}
        text={m.publish_screen__text()}
      />
      {view === 'empty' ? (
        <EmptyState
          layout="row"
          icon={Rocket}
          title={m.publish_screen__empty_title()}
          text={m.publish_screen__empty_text()}
        >
          <Button size="page" type="button" onClick={() => open('chat')}>
            {m.publish_screen__describe_app()}
          </Button>
        </EmptyState>
      ) : (
        targets.map((id) => <PublishTarget key={id} id={id} />)
      )}
      <PublishHosts />
    </div>
  )
}
