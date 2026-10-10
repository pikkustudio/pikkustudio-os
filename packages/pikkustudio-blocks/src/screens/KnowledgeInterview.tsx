import { useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { ArrowRight, CircleAlert } from 'lucide-react'
import { m } from '@/i18n/messages'
import { PageHead } from '../blocks/PageHead'
import { Button } from '../ui/button'
import { useProjectKey, useProjectName } from '../lib/project'
import { ProjectRpcCtx } from '../lib/projectRpc'
import { useStartProjectRun } from '../lib/onboarding'
import { ideaWithInterview, type Intake } from '../lib/interview'
import type { KnowledgeBundle } from '../lib/knowledge'

export function KnowledgeInterview() {
  const key = useProjectKey()
  const name = useProjectName()
  const navigate = useNavigate()
  const invoke = useContext(ProjectRpcCtx)
  const prompt = usePikkuMutation('studio:builderPrompt') as unknown as { mutateAsync: (input: object) => Promise<unknown> }
  const start = useStartProjectRun()
  const [going, setGoing] = useState(false)
  const [failed, setFailed] = useState(false)
  const asked = useRef('')

  const intake = usePikkuQuery('studio:projectIntake' as never, { key } as never, { enabled: !!key } as never) as unknown as { data?: Intake }
  const state = usePikkuQuery('studio:builderState', { key, specialist: 'knowledge' } as never, { enabled: !!key } as never) as unknown as { data?: { items: unknown[] }; isSuccess: boolean }

  useEffect(() => {
    if (!key || !intake.data?.idea || !state.isSuccess || state.data?.items.length || asked.current === key) return
    asked.current = key
    prompt.mutateAsync({ key, mode: 'knowledge', message: m.knowledge_interview__first_message({ idea: intake.data.idea }) }).catch(() => {
      asked.current = ''
    })
  }, [key, intake.data?.idea, state.isSuccess, state.data?.items.length])

  const next = async () => {
    setGoing(true)
    setFailed(false)
    try {
      const saved = intake.data
      const bundle = (await invoke(key, 'console:getKnowledge', {}).catch(() => null)) as KnowledgeBundle | null
      const base = saved?.idea || String(name)
      const { runId } = await start.mutateAsync({
        name: String(name),
        idea: ideaWithInterview(base, bundle),
        key,
        surfaces: saved?.surfaces?.length ? saved.surfaces : ['screens'],
        ...(saved?.devices?.length ? { devices: saved.devices } : {}),
      })
      navigate({ to: '/new-project', search: ((prev: object) => ({ ...prev, run: runId, project: undefined, panel: undefined })) as never })
    } catch {
      setFailed(true)
      setGoing(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PageHead size="lead" crumb={name} title={m.knowledge_interview__title()} text={m.knowledge_interview__lead()}>
        <Button variant="default" size="pageLg" type="button" data-testid="continue-to-designs" disabled={going || !key} onClick={() => void next()}>
          <span>{going ? m.knowledge_interview__going() : m.knowledge_interview__continue()}</span>
          <ArrowRight className="rtl:-scale-x-100 size-5.5" />
        </Button>
      </PageHead>
      {failed ? (
        <p role="alert" className="flex items-center gap-2 text-[15px] font-semibold text-destructive-foreground">
          <CircleAlert className="size-5" aria-hidden="true" />
          {m.knowledge_interview__error()}
        </p>
      ) : null}
    </div>
  )
}
