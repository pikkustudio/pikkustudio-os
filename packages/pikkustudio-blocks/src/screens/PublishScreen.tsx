import { m } from '@/i18n/messages'
import { useContext } from 'react'
import { Button } from '../ui/button'
import { useProjectName } from '../lib/project'
import { EmptyState } from '../blocks/EmptyState'
import { Rocket } from 'lucide-react'
import { PageHead } from '../blocks/PageHead'
import { PublishHosts } from '../blocks/PublishHosts'
import { useSlots } from '../lib/slots'
import { ShellCtx } from '../lib/shell'
import { CloudOffer } from '../blocks/CloudPanel'


export function PublishScreen() {
  const projectName = useProjectName()
  const { view, open } = useContext(ShellCtx)
  const { PublishTarget: Target } = useSlots()
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
      ) : Target ? (
        <Target />
      ) : (
        <CloudOffer open={open} />
      )}
      <PublishHosts />
    </div>
  )
}
