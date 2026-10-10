import { m } from '@/i18n/messages'
import { useContext, useEffect, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { ProjectRpcCtx } from '../lib/projectRpc'
import { newProjectName, useAttachFile, useProjectRun, useStartProjectRun } from '../lib/onboarding'
import { rememberInterview } from '../lib/interview'
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

  const [interview, setInterview] = useState<'making' | 'opening' | null>(null)
  const create = usePikkuMutation('studio:createProject' as never) as unknown as { mutateAsync: (input: object) => Promise<{ key: string }> }
  const open = usePikkuMutation('studio:openProject' as never) as unknown as { mutateAsync: (input: object) => Promise<unknown> }
  const listed = usePikkuQuery('studio:listProjects', {}, { enabled: false })

  const beginInterview = async () => {
    setInterview('making')
    try {
      const name = newProjectName()
      const uploadId = await upload()
      const surfaces = uses.surfaces
      const devices = uses.surfaces.includes('screens') ? uses.devices : undefined
      const made = await create.mutateAsync({ name, idea: idea.trim(), surfaces, ...(devices ? { devices } : {}) })
      rememberInterview(made.key, { name, idea: idea.trim(), surfaces, devices: devices ?? [], ...(uploadId ? { uploadId } : {}) })
      setInterview('opening')
      await open.mutateAsync({ key: made.key }).catch(() => undefined)
      const seen = (await listed.refetch()).data as { projects: { key: string; slug: string }[] } | undefined
      const slug = seen?.projects.find((p) => p.key === made.key)?.slug ?? made.key
      navigate({ to: '/knowledge', search: ((prev: object) => ({ ...prev, project: slug, interview: 'on', panel: 'chat' })) as never })
    } catch {
      setInterview(null)
      setSt('error')
    }
  }

  const begin = async (key?: string) => {
    setSt('loading')
    const name = newProjectName()
    let uploadId: string | undefined
    try {
      uploadId = await upload()
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
        goInterview: () => void beginInterview(),
        interview,
        retry: () => void begin(run.data?.key),
        open: () => {},
        cancel: () => {
          setInterview(null)
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
