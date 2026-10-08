import { m } from '@/i18n/messages'
import { useContext, useEffect, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { ProjectRpcCtx } from '../lib/projectRpc'
import { newProjectName, useAttachFile, useProjectRun, useStartProjectRun } from '../lib/onboarding'
import { OnbCtx, type OnbState, type Uses } from './OnboardingLayout'
import { NewProjectScreen } from './NewProjectScreen'

export function NewProjectRoute() {
  const navigate = useNavigate()
  const q = useSearch({ strict: false }) as { show?: string; run?: string }
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

  const begin = async (key?: string) => {
    setSt('loading')
    const name = newProjectName()
    const uploadId = files.length ? crypto.randomUUID() : undefined
    try {
      for (const file of files) {
        const bytes = new Uint8Array(await file.arrayBuffer())
        let binary = ''
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
        await attach.mutateAsync({ uploadId: uploadId!, name: file.name, data: btoa(binary) })
      }
    } catch {
      return setSt('error')
    }
    start.mutate(
      { name, idea: idea.trim(), ...(uploadId ? { uploadId } : {}), ...(key ? { key } : {}), surfaces: uses.surfaces, ...(uses.surfaces.includes('screens') ? { devices: uses.devices } : {}) },
      { onSuccess: (r: { runId: string }) => set({ run: r.runId }), onError: () => setSt('error') },
    )
  }

  const done = run.data?.status === 'completed'
  const invoke = useContext(ProjectRpcCtx)
  const made = usePikkuQuery('studio:listProjects', {}, { enabled: false })
  useEffect(() => {
    if (!done) return
    made.refetch().then((r) => {
      const found = (r.data as { projects: { key: string; slug: string }[] } | undefined)?.projects.find((p) => p.key === run.data?.key)
      const slug = found?.slug
      const land = (to: '/projects' | '/artifacts/explore') =>
        navigate({ to, search: ((prev: object) => ({ ...prev, run: undefined, project: slug })) as never })
      if (!slug) return land('/projects')
      const first = async () => {
        for (let i = 0; i < 90; i++) {
          const got = await invoke(run.data!.key!, 'console:listArtifacts').catch(() => null)
          if (got?.artifacts?.length) return got.artifacts[0].id as string
          await new Promise((res) => setTimeout(res, 2000))
        }
      }
      first().then(() => land('/artifacts/explore'))
    })
  }, [done])

  return (
    <OnbCtx.Provider
      value={{
        st,
        go: () => void begin(),
        retry: () => void begin(run.data?.key),
        open: () => {},
        cancel: () => {
          set({ run: undefined })
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
