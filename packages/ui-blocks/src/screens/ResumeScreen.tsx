import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { RefreshCw } from 'lucide-react'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { m } from '@/i18n/messages'
import { Button } from '../ui/button'
import { MachineOpening, OpeningStage, openingH1, openingLead, type OpeningStep } from '../blocks/MachineOpening'
import { useProjectKey, useProjectName } from '../lib/project'

type LiveApp = { slug: string; url: string | null; state: 'starting' | 'ready' | 'failed' }

export function ResumeScreen() {
  const navigate = useNavigate()
  const key = useProjectKey()
  const name = useProjectName()
  const asked = useRef('')
  const apps = usePikkuQuery('studio:projectApps', { key }, { enabled: false, refetchInterval: 2000 } as never)
  const open = usePikkuMutation('studio:openProject', { onSuccess: () => apps.refetch() })
  const close = usePikkuMutation('studio:closeProject', { onSuccess: () => open.mutate({ key }) })

  useEffect(() => {
    if (!key || asked.current === key) return
    asked.current = key
    open.mutate({ key })
  }, [key])

  const list = (apps.data as LiveApp[] | undefined) ?? []
  const opened = open.isSuccess
  const failed = open.isError || close.isError || list.some((a) => a.state === 'failed')
  const ready = opened && apps.isSuccess && list.every((a) => a.state === 'ready')

  useEffect(() => {
    if (ready) navigate({ to: '/home', search: ((prev: object) => prev) as never, replace: true })
  }, [ready])

  const retry = () => {
    if (list.some((a) => a.state === 'failed')) close.mutate({ key })
    else open.mutate({ key })
  }
  const back = () => navigate({ to: '/projects', search: ((prev: object) => ({ ...prev, project: undefined })) as never })

  const steps: OpeningStep[] = [
    { label: m.resume__step_workspace(), state: opened ? 'done' : 'now' },
    { label: m.resume__step_start(), state: !opened ? 'wait' : ready ? 'done' : 'now' },
    { label: m.resume__step_ready(), state: ready ? 'done' : 'wait' },
  ]

  return (
    <div className="mx-auto flex max-w-[1160px] flex-col gap-10 @min-[1700px]/app:max-w-[1380px]">
      <OpeningStage>
        {failed ? (
          <div role="status">
            <h1 className={openingH1}>{m.resume__failed_title()}</h1>
            <p className={openingLead}>{m.resume__failed_lead()}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3">
              <Button variant="hero" size="page" type="button" disabled={open.isPending || close.isPending} onClick={retry}>
                <RefreshCw className="size-5" aria-hidden="true" />
                {m.resume__try_again()}
              </Button>
              <Button variant="heroGhost" size="page" type="button" onClick={back}>
                {m.resume__back()}
              </Button>
            </div>
          </div>
        ) : (
          <MachineOpening title={m.resume__title({ name })} lead={m.resume__lead()} steps={steps} onCancel={back} cancelLabel={m.resume__back()} />
        )}
      </OpeningStage>
    </div>
  )
}
