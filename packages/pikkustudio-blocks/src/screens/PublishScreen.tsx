import { useContext } from 'react'
import { Button } from '../ui/button'
import { useProjectName } from '../lib/project'
import { EmptyState } from '../blocks/EmptyState'
import { Rocket } from 'lucide-react'
import { PageHead } from '../blocks/PageHead'
import { PublishHosts } from '../blocks/PublishHosts'
import { useSlots } from '../lib/slots'
import { ShellCtx } from '../lib/shell'


export function PublishScreen() {
  const projectName = useProjectName()
  const { view, open } = useContext(ShellCtx)
  const { PublishTarget: Target } = useSlots()
  return (
    <div className="mx-auto flex max-w-[1160px] flex-col gap-7.5 @min-[1700px]/app:max-w-[1380px]">
      <PageHead
        size="lead"
        crumb={projectName}
        title="Put your app on the internet"
        text="Publishing makes your app available online, so other people can use it. Right now only you can see it."
      />
      {view === 'empty' ? (
        <EmptyState
          layout="row"
          icon={Rocket}
          title="There is nothing to publish yet."
          text="Your app has no pages yet. Tell Pikku what you want to make, and once something is built you can put it online from here."
        >
          <Button size="page" type="button" onClick={() => open('chat')}>
            Describe your app
          </Button>
        </EmptyState>
      ) : Target ? (
        <Target />
      ) : null}
      <PublishHosts />
    </div>
  )
}
