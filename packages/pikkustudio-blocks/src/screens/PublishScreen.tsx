import { m } from '@/i18n/messages'
import { STUDIO_LOCAL } from '@/lib/env'
import { Fragment, useContext, type ReactNode } from 'react'
import { Button } from '../ui/button'
import { useProjectKey, useProjectName } from '../lib/project'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { EmptyState } from '../blocks/EmptyState'
import { Rocket } from 'lucide-react'
import { PageHead } from '../blocks/PageHead'
import { PublishHosts } from '../blocks/PublishHosts'
import { ShellCtx } from '../lib/shell'


/**
 * Publishing the project. `targets` are the panels for publish targets a host brings, by the target's id from
 * studio:publishOptions; a target with no panel shows nothing here.
 */
export function PublishScreen({ targets: panels = {} }: { targets?: Partial<Record<string, ReactNode>> } = {}) {
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
        targets.map((id) => <Fragment key={id}>{panels[id] ?? null}</Fragment>)
      )}
      {/* Other hosts are set up by this computer's builder, so the web build offers only its own targets. */}
      {STUDIO_LOCAL ? <PublishHosts /> : null}
    </div>
  )
}
