import { m } from '@/i18n/messages'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { newProjectName, useAttachFile, useProjectRun, useStartProjectRun } from '../lib/onboarding'
import { useNoteRun } from '../lib/project-flow'
import { OnbCtx, type OnbState, type Uses } from './OnboardingLayout'
import { NewProjectScreen } from './NewProjectScreen'

export function NewProjectRoute() {
  const navigate = useNavigate()
  const q = useSearch({ strict: false }) as { show?: string; run?: string; path?: string }
  const run = useProjectRun(q.run)
  const base: OnbState =
    q.show === 'empty' || q.show === 'loading' || q.show === 'error'
      ? q.show
      : q.run
        ? run.isError || run.data?.status === 'failed' || run.data?.status === 'cancelled'
          ? 'error'
          : 'loading'
        : 'normal'
  const [override, setSt] = useState<OnbState | null>(null)
  useEffect(() => setSt(null), [base])
  const st = override ?? base
  const [idea, setIdea] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [uses, setUses] = useState<Uses>({ audience: 'others', surfaces: ['screens'], devices: ['browser'] })
  const start = useStartProjectRun()
  const attach = useAttachFile()
  const set = (patch: Record<string, unknown>) =>
    navigate({ to: '.', search: ((prev: object) => ({ ...prev, ...patch })) as never, replace: true })

  const upload = async () => {
    const uploadId = files.length ? crypto.randomUUID() : undefined
    for (const file of files) {
      const bytes = new Uint8Array(await file.arrayBuffer())
      let binary = ''
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      await attach.mutateAsync({ uploadId: uploadId!, name: file.name, data: btoa(binary) })
    }
    return uploadId
  }

  const interview = q.path === 'interview'

  const begin = async (key?: string, path?: 'interview') => {
    setSt('loading')
    const name = newProjectName()
    let uploadId: string | undefined
    try {
      uploadId = await upload()
    } catch {
      return setSt('error')
    }
    start.mutate(
      { name, idea: idea.trim(), ...(uploadId ? { uploadId } : {}), ...(key ? { key } : {}), surfaces: uses.surfaces, ...(uses.surfaces.includes('screens') ? { devices: uses.devices } : {}), ...(path ? { path } : {}) },
      { onSuccess: (r: { runId: string }) => set({ run: r.runId, path }), onError: () => setSt('error') },
    )
  }

  const made = usePikkuQuery('studio:listProjects', {}, { enabled: false })
  const noteRun = useNoteRun()
  const key = run.data?.key
  const gone = useRef('')
  useEffect(() => {
    if (!key || !q.run || gone.current === q.run) return
    gone.current = q.run
    made.refetch().then(async (r) => {
      const found = (r.data as { projects: { key: string; slug: string }[] } | undefined)?.projects.find((p) => p.key === key)
      if (!interview) await noteRun.mutateAsync({ key, runId: q.run! }).catch(() => {})
      navigate({ to: '/project' as never, search: ((prev: object) => ({ ...prev, run: undefined, path: undefined, project: found?.slug ?? key, panel: 'chat' })) as never })
    })
  }, [key, q.run])

  return (
    <OnbCtx.Provider
      value={{
        st,
        go: () => void begin(),
        goInterview: () => void begin(undefined, 'interview'),
        interview,
        retry: () => void begin(run.data?.key, interview ? 'interview' : undefined),
        open: () => {},
        cancel: () => {
          set({ run: undefined, path: undefined })
          setSt('normal')
        },
        idea,
        setIdea,
        uses,
        setUses,
        files,
        setFiles,
        example: m.onboarding__example(),
        run: run.data,
      }}
    >
      <NewProjectScreen />
    </OnbCtx.Provider>
  )
}
