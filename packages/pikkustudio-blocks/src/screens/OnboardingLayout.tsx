import { asI18n, sep, type I18nString } from '@pikku/react'
import { Blob, type BlobPoseName } from '../blocks/Blob'
import { PikkuMark } from '../blocks/PikkuMark'
import { Outlet, useLocation, useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import { Link } from '../blocks/Link'
import { EmptyState } from '../blocks/EmptyState'
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { ProjectRpcCtx } from '../lib/projectRpc'
import { Button } from '../ui/button'
import { AiLitellmPanel, AiProviderPanel, providers } from '../blocks/AiConnectPanels'
import { useSlots } from '../lib/slots'
import { useCopy } from '../lib/copy'
import { CloudPanel } from '../blocks/CloudPanel'
import { PanelRow } from '../blocks/ShellAccount'
import { useAccount, useProjectRun, useRecentProjects, useStartProjectRun, useAttachFile, newProjectName, type ProjectRun } from '../lib/onboarding'
import { ArrowRight, Bell, Check, CircleAlert, FolderOpen, Laptop, MessageCircle, Pin, ShieldCheck, User, X, CheckCheck } from 'lucide-react'
import { safeRedirect } from '../lib/sign-in-redirect'
import { m } from '@/i18n/messages'

// The onboarding layout: setup rail (Getting set up), Pikku button + bubble, side panels.
// Sign in, Choose AI and New project are children of this layout. Page content lives in the route files.

export type OnbState = 'empty' | 'normal' | 'loading' | 'error'
export type PanelId = 'chat' | 'updates' | 'workspace' | 'diff' | 'why' | 'local' | 'accounts' | 'keys' | 'provider' | 'litellm' | 'pitch'

export type Uses = { audience: 'me' | 'others'; surfaces: string[]; devices: string[] }

export const OnbCtx = createContext<{
  st: OnbState
  go: () => void
  goInterview?: () => void
  interview?: boolean
  retry: () => void
  open: (id: PanelId | '') => void
  cancel: () => void
  idea: string
  setIdea: (v: string) => void
  uses: Uses
  setUses: (v: Uses) => void
  files: File[]
  setFiles: (v: File[]) => void
  example: string
  run?: ProjectRun
}>(null as never)


// eslint-disable-next-line @typescript-eslint/no-explicit-any
const keep: any = { search: true }



const item =
  'flex w-full items-center gap-3 rounded-lg px-3 text-start font-semibold no-underline transition-colors duration-140 hover:bg-secondary hover:text-foreground active:bg-surface-3'
const iconBtn =
  'grid size-11 shrink-0 place-items-center rounded-full text-ink-2 transition-colors duration-140 hover:bg-secondary hover:text-foreground active:bg-surface-3'


type Mood = 'calm' | 'ask' | 'worry' | 'busy'
const RING: Record<Mood, string> = {
  calm: 'border-success',
  ask: 'border-warning',
  worry: 'border-destructive',
  busy: 'border-info border-dashed animate-[spin_6s_linear_infinite]',
}

const POSE: Record<Mood, BlobPoseName> = { calm: 'blob', ask: 'ask', worry: 'alert', busy: 'think' }

function Avatar({ mood, size = 'lg', ring = true }: { mood: Mood; size?: 'lg' | 'md' | 'sm' | 'xs'; ring?: boolean }) {
  const box = { lg: 'size-15', md: 'size-11', sm: 'size-9', xs: 'size-10' }[size]
  const mark = { lg: 'size-20', md: 'size-15', sm: 'size-12', xs: 'size-14' }[size]
  const ringBox = size === 'sm' ? '-inset-0.75 border-2' : '-inset-1 border-3'
  return (
    <span className={`relative grid shrink-0 place-items-center rounded-full ${box}`}>
      <Blob pose={POSE[mood]} className={mark} />
      {ring ? <span className={`absolute rounded-full opacity-90 ${ringBox} ${RING[mood]}`} /> : null}
    </span>
  )
}

const STEPS: readonly (readonly [string, () => I18nString, () => I18nString])[] = [
  ['/sign-in', m.onboarding_layout__step_sign_in, m.copy__step_sign_in_hint],
  ['/your-name', m.onboarding_layout__step_about_you, m.onboarding_layout__step_about_you_hint],
  ['/choose-ai', m.onboarding_layout__step_choose_ai, m.onboarding_layout__step_choose_ai_hint],
  ['/new-project', m.onboarding_layout__step_start, m.onboarding_layout__step_start_hint],
]

const MOODS: Record<OnbState, Mood> = { empty: 'calm', normal: 'calm', loading: 'busy', error: 'worry' }

type Msg = { kind: 'me' | 'pikku'; text: I18nString }

export function OnboardingLayout() {
  const navigate = useNavigate()
  const router = useRouter()
  const q = useSearch({ strict: false }) as { redirect?: string; look?: 'light' | 'dark'; panel?: PanelId; show?: string; pitch?: 'a' | 'b'; via?: string; run?: string }
  const panel: PanelId | '' = q.panel ?? ''
  const { ShellAccount, WorkspaceAbout } = useSlots()
  const copy = useCopy()
  const path = useLocation({ select: (l) => l.pathname })
  const choose = path === '/choose-ai'
  const proj = path === '/new-project'
  const account = useAccount()
  const projects = useRecentProjects()
  const yourName = path === '/your-name'
  const fromQueries = (rs: UseQueryResult<unknown>[], ready: () => OnbState): OnbState =>
    rs.some((r) => r.isPending || (r.isError && r.isFetching)) ? 'loading' : rs.some((r) => r.isError) ? 'error' : ready()
  const run = useProjectRun(q.run)
  const base: OnbState = proj
    ? q.show === 'empty' || q.show === 'loading' || q.show === 'error'
      ? q.show
      : q.run
        ? run.isError || run.data?.status === 'failed' || run.data?.status === 'cancelled'
          ? 'error'
          : 'loading'
        : 'normal'
    : choose
      ? fromQueries([account], () => 'normal')
      : yourName
        ? fromQueries([account], () => 'normal')
        : fromQueries(account.data?.signIn ? [account, projects] : [account], () =>
            projects.data?.length ? 'normal' : 'empty',
          )
  const [override, setSt] = useState<OnbState | null>(null)
  useEffect(() => setSt(null), [base, path])
  const st = override ?? base
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])
  const signIn = path === '/sign-in'
  const mood: Mood = signIn || choose || proj || yourName ? MOODS[st] : 'calm'
  const stepNow = Math.max(0, STEPS.findIndex(([to]) => to === path))

  const set = (patch: Record<string, unknown>) =>
    navigate({ to: '.', search: ((prev: object) => ({ ...prev, ...patch })) as never, replace: true })
  const open = (id: PanelId | '') => set({ panel: id || undefined })
  const start = useStartProjectRun()
  const attach = useAttachFile()
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
  const done = proj && run.data?.status === 'completed'
  const invoke = useContext(ProjectRpcCtx)
  const made = usePikkuQuery('studio:listProjects', {}, { enabled: false })
  useEffect(() => {
    if (!done) return
    made.refetch().then((r) => {
      const made = (r.data as { projects: { key: string; slug: string; owner?: string }[] } | undefined)?.projects.find((p) => p.key === run.data?.key)
      const slug = made?.slug
      const land = (to: '/home' | '/projects' | '/artifacts' | '/artifacts/$id', params?: { id: string }) =>
        navigate({ to, ...(params ? { params } : {}), search: ((prev: object) => ({ ...prev, run: undefined, project: slug })) as never })
      if (!slug) return land('/projects')
      const first = async () => {
        for (let i = 0; i < 90; i++) {
          const found = await invoke(run.data!.key!, 'console:listArtifacts').catch(() => null)
          if (found?.artifacts?.length) return found.artifacts[0].id as string
          await new Promise((r) => setTimeout(r, 2000))
        }
      }
      first().then(() => land('/artifacts/explore' as never))
    })
  }, [done])
  const back = safeRedirect(q.redirect)
  const go = () => {
    if (proj) return begin()
    setSt('loading')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(
      () => back && (choose || (path === '/sign-in' && account.data?.name)) ? router.history.push(back) : navigate({ to: proj ? '/home' : choose ? '/new-project' : yourName || account.data?.name ? '/choose-ai' : '/your-name', search: ((prev: object) => prev) as never }),
      proj ? 2600 : 1500,
    )
  }
  const cancel = () => {
    window.clearTimeout(timer.current)
    if (proj) set({ run: undefined })
    setSt('normal')
  }
  const [idea, setIdea] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [uses, setUses] = useState<Uses>({ audience: 'others', surfaces: ['screens'], devices: ['browser'] })
  const fillExample = () => {
    setIdea(m.onboarding__example())
    document.getElementById('idea')?.focus()
  }
  const retry = () => {
    if (!proj) {
      ;(choose ? [account] : yourName ? [account] : account.data?.signIn ? [account, projects] : [account]).forEach((r) => r.refetch())
      return
    }
    begin(run.data?.key)
  }

  const [pinned, setPinned] = useState(false)
  const [draft, setDraft] = useState('')
  const [bubbleDraft, setBubbleDraft] = useState('')
  const [extra, setExtra] = useState<Msg[]>([])
  const [bubbleOpen, setBubbleOpen] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pinned) open('')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pinned])

  const say = (text: I18nString) => {
    open('chat')
    setExtra((x) => [...x, { kind: 'me', text }])
    window.setTimeout(
      () =>
        setExtra((x) => [
          ...x,
          { kind: 'pikku', text: m.onboarding_layout__good_question() },
        ]),
      1200,
    )
  }

  const panelTitle = { chat: m.parts__talk_to_pikku(), updates: m.shell_layout__updates(), workspace: m.onboarding_layout__this_workspace(), diff: m.onboarding_layout__the_difference(), why: m.onboarding_layout__why_this_one(), local: m.onboarding_layout__set_up_here(), accounts: m.onboarding_layout__connect_account(), keys: m.onboarding_layout__use_own_key(), litellm: m.onboarding_layout__connect_litellm(), provider: m.onboarding_layout__connect_provider({ provider: providers().find(([, id]) => id === q.via)?.[0] ?? m.onboarding_layout__a_provider() }), pitch: m.cloud_pitch__what_cloud_adds() }
  const tabs = panel === 'chat' || panel === 'updates'
  const tab =
    '-mb-px inline-flex h-11.5 items-center gap-2 rounded-t-[10px] border-b-3 px-3.5 text-[15px] font-bold transition-colors duration-140 hover:bg-secondary hover:text-foreground active:bg-surface-3'

  const whyRows: [I18nString, I18nString, string][] = [
    [m.onboarding_layout__why_quick(), m.onboarding_layout__why_quick_text(), 'bg-accent text-accent-foreground'],
    [m.onboarding_layout__why_nothing(), m.onboarding_layout__why_nothing_text(), 'bg-success-soft text-success-foreground'],
    [m.onboarding_layout__why_no_bill(), copy.whyNoBillText(), 'bg-indigo text-white'],
  ]
  const chips: [I18nString, boolean, () => void][] = choose
    ? st === 'normal'
      ? [
          [m.onboarding_layout__connect_my_litellm(), false, () => open('litellm')],
        ]
      : st === 'empty'
        ? [[m.onboarding_layout__use_it(), true, go]]
        : st === 'error'
          ? [
              [m.app_not_running__try_again(), true, retry],
              [m.onboarding_layout__connect_my_litellm(), false, () => open('litellm')],
            ]
          : []
    : proj
    ? st === 'normal' || st === 'empty'
      ? [[m.shell_layout__give_me_an_example(), false, fillExample]]
      : st === 'error'
        ? [[m.app_not_running__try_again(), true, retry]]
        : []
    : !signIn
    ? []
    : st === 'empty'
      ? [[m.onboarding_layout__ask_pick(), false, () => open('diff')]]
      : st === 'error'
        ? [
            [m.onboarding_layout__use_this_computer(), true, go],
            [m.app_not_running__try_again(), false, retry],
          ]
        : []

  return (
    <OnbCtx.Provider value={{ st: signIn || choose || proj || yourName ? st : 'empty', go, retry, open, cancel, idea, setIdea, uses, setUses, files, setFiles, example: m.onboarding__example(), run: run.data }}>
      <div
        className="@container/app fixed inset-0 z-0 overflow-hidden bg-background font-sans text-[16px] leading-[1.5] text-foreground antialiased"
      >

        <div className="group/shell relative flex h-full overflow-hidden" data-open={panel !== '' ? '' : undefined}>
          {/* Rail */}
          <aside
            className="flex min-h-0 w-63 shrink-0 flex-col gap-5 overflow-auto border-e border-border bg-muted px-4 py-5 @min-[1700px]/app:w-70"
            aria-label={m.onboarding_layout__getting_set_up()}
          >
            <Link {...keep} to="/sign-in" className="flex items-center gap-2.5 px-2 py-1 font-heading text-[24px] font-extrabold tracking-[-0.02em] no-underline">
              <PikkuMark label={copy.brandLabel()} />
              {copy.brandName()}
            </Link>
            {projects.data?.length ? null : <div>
              <div className="mb-1.5 px-3 text-[13px] font-semibold text-muted-foreground">{m.onboarding_layout__getting_set_up()}</div>
              <ol className="flex list-none flex-col px-2">
                {STEPS.map(([to, title, hint], i) => {
                  const state = i < stepNow ? 'done' : i === stepNow ? 'current' : 'upcoming'
                  const inner = (
                    <>
                      <span
                        className={`grid size-7 place-items-center rounded-full border-2 ${
                          state === 'done'
                            ? 'border-success bg-success text-primary-foreground'
                            : state === 'current'
                              ? 'border-primary bg-primary'
                              : 'border-dashed border-input text-muted-foreground'
                        }`}
                      >
                        {state === 'done' ? <Check className="size-4" strokeWidth={2.5} /> : null}
                        {state === 'current' ? <span className="size-2 rounded-full bg-primary-foreground" /> : null}
                      </span>
                      <div>
                        <div className={`text-[15px] leading-7 font-semibold ${state === 'upcoming' ? 'text-muted-foreground' : ''}`}>{title()}</div>
                        {state === 'current' ? <div className="-mt-0.5 text-[14px] leading-[1.4] text-ink-2">{to === '/sign-in' ? copy.stepSignInHint() : hint()}</div> : null}
                      </div>
                    </>
                  )
                  const line = `relative grid grid-cols-[28px_1fr] gap-3 text-start no-underline ${
                    i < STEPS.length - 1
                      ? `pb-5.5 before:absolute before:top-7.5 before:bottom-0.5 before:start-3.25 before:w-0.5 before:rounded-sm ${state === 'done' ? 'before:bg-success' : 'before:bg-input'}`
                      : ''
                  }`
                  return (
                    <li key={to} aria-current={state === 'current' ? 'step' : undefined}>
                      {state === 'done' ? (
                        <Link {...keep} to={to} className={line}>
                          {inner}
                        </Link>
                      ) : (
                        <div className={line}>{inner}</div>
                      )}
                    </li>
                  )
                })}
              </ol>
            </div>}
            {projects.data?.length ? null : <p className="px-3 text-[14px] leading-[1.45] text-ink-2 text-pretty">{copy.railPitch()}</p>}
            <div className="mt-auto flex flex-col gap-2.5">
              {ShellAccount ? (
                <ShellAccount expanded onOpen={() => open('workspace')} onAccount={() => open('workspace')} />
              ) : (
              <button
                type="button"
                aria-expanded={panel === 'workspace'}
                onClick={() => open('workspace')}
                className={`grid grid-cols-[auto_1fr] items-center gap-2.5 rounded-[14px] border border-border px-3 py-2.5 text-start transition-colors duration-140 hover:border-input hover:bg-secondary active:bg-surface-3 ${panel === 'workspace' ? 'border-input bg-secondary' : ''}`}
              >
                <Laptop className="size-5 text-muted-foreground" />
                <span className="min-w-0">
                  <b className="block text-[14px] leading-[1.3] font-bold">{m.onboarding_layout__on_this_computer()}</b>
                  <small className="block text-[13px] leading-[1.3] text-muted-foreground">{m.onboarding_layout__only_you()}</small>
                </span>
              </button>
              )}
            </div>
          </aside>

          {/* Page area */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col pe-0 transition-all duration-420 ease-[cubic-bezier(.16,1,.3,1)] group-data-open/shell:pe-102 @min-[1700px]/app:group-data-open/shell:pe-120 [:root:has([data-side-panel])_&]:pe-102 @min-[1700px]/app:[:root:has([data-side-panel])_&]:pe-120">
            <div className="min-h-0 flex-1 overflow-auto scroll-smooth px-12 pt-9 pb-7 @min-[1700px]/app:px-16 @min-[1700px]/app:pt-11 @min-[1700px]/app:pb-8">
              <Outlet />
            </div>
          </div>

          {/* Side panel: Chat, Updates, This workspace, The difference */}
          <aside
            aria-hidden={panel === ''}
            className={`absolute inset-y-0 end-0 z-5 flex w-102 flex-col border-s border-border bg-card shadow-[0_24px_56px_-14px_rgba(8,40,52,0.35)] transition-all duration-420 ease-[cubic-bezier(.16,1,.3,1)] @min-[1700px]/app:w-120 ${panel !== '' ? 'visible translate-x-0' : 'invisible translate-x-full rtl:-translate-x-full'}`}
          >
            <div className="flex items-center gap-0.5 pt-4 pe-3 pb-2.5 ps-6">
              <h2 className="flex-1 text-[24px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">{panel ? panelTitle[panel] : null}</h2>
              <button
                type="button"
                aria-pressed={pinned}
                aria-label={pinned ? m.onboarding_layout__unpin() : m.onboarding_layout__keep_open()}
                onClick={() => setPinned((p) => !p)}
                className={`${iconBtn} ${pinned ? 'bg-accent text-accent-foreground' : ''}`}
              >
                <Pin className={pinned ? 'size-5.5 fill-current' : 'size-5.5'} />
              </button>
              <button type="button" aria-label={m.shell_layout__close_panel()} onClick={() => open('')} className={iconBtn}>
                <X className="size-5.5" />
              </button>
            </div>
            {tabs ? (
              <div className="flex gap-1 border-b border-border px-5" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={panel === 'chat'}
                  onClick={() => open('chat')}
                  className={`${tab} ${panel === 'chat' ? 'border-primary text-accent-foreground' : 'border-transparent text-ink-2'}`}
                >
                  <MessageCircle className="size-4.5" />
                  {m.shell_layout__chat()}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={panel === 'updates'}
                  onClick={() => open('updates')}
                  className={`${tab} ${panel === 'updates' ? 'border-primary text-accent-foreground' : 'border-transparent text-ink-2'}`}
                >
                  <Bell className="size-4.5" />
                  {m.shell_layout__updates()}
                </button>
              </div>
            ) : null}

            {panel === 'diff' ? (
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 pt-5 pb-7">
                <div className="grid grid-cols-[auto_1fr] items-start gap-3 rounded-[18px] bg-secondary p-4">
                  <Avatar mood="calm" size="md" />
                  <p className="font-heading text-[17px] leading-[1.4] text-pretty">{m.onboarding_layout__diff_intro()}</p>
                </div>
                <div className="flex flex-col gap-1.5 rounded-[18px] border border-border p-4.5">
                  <h3 className="text-[19px] font-bold tracking-[-0.012em] text-balance">{m.onboarding_layout__use_on_computer()}</h3>
                  <p className="text-[15px] text-ink-2 text-pretty">
                    {copy.diffLocal()}
                  </p>
                </div>
                {copy.diffHosted ? (
                  <div className="flex flex-col gap-1.5 rounded-[18px] border border-border p-4.5">
                    <h3 className="text-[19px] font-bold tracking-[-0.012em] text-balance">{copy.diffHosted.title()}</h3>
                    <p className="text-[15px] text-ink-2 text-pretty">{copy.diffHosted.text()}</p>
                  </div>
                ) : null}
                <Button variant="default" size="compact" className="self-start" type="button" onClick={() => open('')}>
                  
                  {m.onboarding_layout__got_it()}
                </Button>
              </div>
            ) : null}

            {panel === 'why' ? (
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 pt-5 pb-7">
                <div className="grid grid-cols-[auto_1fr] items-start gap-3 rounded-[18px] bg-secondary p-4">
                  <Avatar mood="calm" size="md" />
                  <p className="font-heading text-[17px] leading-[1.4] text-pretty">{m.onboarding_layout__why_intro()}</p>
                </div>
                <ul className="flex list-none flex-col">
                  {whyRows.map(([t, d, tone]) => (
                    <li key={t} className="flex items-center gap-3.5 border-b border-border py-3.5 last:border-b-0">
                      <span className={`grid size-11 place-items-center rounded-xl ${tone}`}>
                        <Check className="size-6" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <b className="block text-[16px]">{t}</b>
                        <small className="text-[14px] text-muted-foreground">{d}</small>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="text-[14px] text-muted-foreground text-pretty">
                  {m.onboarding_layout__why_private()}
                </p>
                <Button variant="default" size="page" type="button" onClick={() => open('')}>
                  
                  {m.onboarding_layout__okay_got_it()}
                </Button>
              </div>
            ) : null}

            {panel === 'pitch' ? <CloudPanel variant={q.pitch} avatar={<Avatar mood="calm" size="md" />} onClose={() => open('')} /> : null}

            {panel === 'provider' ? <AiProviderPanel provider={q.via ?? ''} onDone={() => { open(''); go() }} onBack={() => open('')} /> : null}

            {panel === 'litellm' ? <AiLitellmPanel intro={<Avatar mood="calm" size="md" />} via={q.via} onDone={() => { open(''); go() }} onBack={() => open('')} /> : null}

            {panel === 'chat' ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex items-center gap-2 border-b border-border bg-secondary px-6 py-3 text-[14px] text-ink-2">
                  <FolderOpen className="size-4.5 text-accent-foreground" />
                  <span className="font-semibold text-muted-foreground">{m.shell_layout__about()}</span>
                  <b className="text-foreground">{proj ? m.onboarding_layout__about_project() : choose ? m.onboarding_layout__about_choosing() : m.onboarding_layout__about_signing()}</b>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-4.5 overflow-auto px-6 py-5" tabIndex={0} aria-label={m.shell_layout__chat()} role="log">
                  <div className="self-center text-[13px] font-semibold text-muted-foreground">{m.onboarding_layout__today()}</div>
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5">
                      <Avatar mood="calm" size="sm" />
                    </span>
                    <div className="flex min-w-0 flex-col gap-2 text-[16px] leading-[1.5] text-foreground">
                      {proj ? (
                        <p className="text-pretty">{m.onboarding_layout__chat_proj()}</p>
                      ) : choose ? (
                        <p className="text-pretty">{copy.chatChooseAi()}</p>
                      ) : (
                        <>
                          <p className="text-pretty">{m.onboarding_layout__chat_hi()}</p>
                          <p className="text-pretty">{m.onboarding_layout__chat_ask()}</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="ms-12 flex flex-wrap gap-2">
                    {(proj ? [m.onboarding_layout__ask_build(), m.onboarding_layout__ask_draft_time()] : choose ? [m.onboarding_layout__ask_pick(), m.onboarding_layout__ask_key_private()] : [m.onboarding_layout__ask_pick(), m.onboarding_layout__ask_switch()]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => say(s)}
                        className="inline-flex h-10 items-center gap-2 rounded-full border-[1.5px] border-input bg-card px-4 text-[14px] font-bold transition-colors duration-140 hover:border-muted-foreground hover:bg-secondary active:bg-surface-3"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  {extra.map((msg, i) =>
                    msg.kind === 'me' ? (
                      <div key={i} className="flex min-w-0 items-start justify-end gap-3">
                        <div className="flex max-w-5/6 min-w-0 flex-col gap-2 rounded-t-[18px] rounded-es-[18px] rounded-ee-[4px] bg-accent px-4 py-2.5 text-[16px] leading-[1.5] text-foreground">
                          {msg.text}
                        </div>
                      </div>
                    ) : (
                      <div key={i} className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5">
                          <Avatar mood="calm" size="sm" />
                        </span>
                        <div className="flex min-w-0 flex-col gap-2 text-[16px] leading-[1.5] text-foreground">
                          <p className="text-pretty">{msg.text}</p>
                        </div>
                      </div>
                    ),
                  )}
                  {proj && st === 'loading' ? (
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5">
                        <Avatar mood="busy" size="sm" />
                      </span>
                      <div className="flex gap-1.25 px-1 py-3.5" role="status" aria-label={m.onboarding_layout__typing()}>
                        <i className="size-2 animate-bounce rounded-full bg-muted-foreground" />
                        <i className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:150ms]" />
                        <i className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:300ms]" />
                      </div>
                    </div>
                  ) : null}
                  {proj && st === 'error' ? (
                    <div role="alert" className="ms-12 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1.5 rounded-card border-[1.5px] border-destructive bg-destructive-soft px-4.5 py-4 text-foreground">
                      <CircleAlert className="size-7 text-destructive-foreground" />
                      <div>
                        <b className="mb-0.5 block text-[17px]">{m.onboarding_layout__could_not_send()}</b>
                        <p className="text-[15px] text-ink-2 text-pretty">{m.onboarding_layout__nothing_lost_msg()}</p>
                      </div>
                      <div className="col-span-full flex flex-wrap gap-2">
                        <Button variant="bordered" size="compact" type="button" onClick={retry}>
                          
                          {m.app_not_running__try_again()}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </div>
                <form
                  className="flex items-end gap-2 border-t border-border bg-card px-5 pt-3.5 pb-4.5"
                  aria-label={m.shell_layout__message_pikku()}
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!draft.trim()) return
                    {
                      const text = draft.trim()
                      say(asI18n(text))
                    }
                    setDraft('')
                  }}
                >
                  <textarea
                    rows={1}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    aria-label={m.shell_layout__message_pikku()}
                    placeholder={m.shell_layout__ask_or_tell()}
                    className="max-h-35 min-h-12 flex-1 resize-none rounded-[24px] border-[1.5px] border-input bg-background px-4.5 py-3 text-[15px] leading-[1.4] text-foreground hover:border-muted-foreground focus:border-primary focus:ring-4 focus:ring-accent focus:outline-none"
                  />
                  <button
                    type="submit"
                    aria-label={m.parts__send()}
                    disabled={!draft.trim()}
                    className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-colors duration-140 hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ArrowRight className="rtl:-scale-x-100 size-5.5" />
                  </button>
                </form>
              </div>
            ) : null}

            {panel === 'updates' ? (
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 pt-5 pb-7">
                {proj && st === 'loading' ? (
                  <div role="status" aria-label={m.onboarding_layout__loading_updates()} className="flex flex-col gap-3.5">
                    <div className="min-h-32.5 animate-pulse rounded-[22px] bg-secondary" />
                    <div className="min-h-32.5 animate-pulse rounded-[22px] bg-secondary" />
                  </div>
                ) : proj && st === 'error' ? (
                  <div role="alert" className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1.5 rounded-card border-[1.5px] border-destructive bg-destructive-soft px-6 py-5 text-foreground">
                    <CircleAlert className="size-7 text-destructive-foreground" />
                    <div>
                      <b className="mb-0.5 block text-[17px]">{m.onboarding_layout__could_not_load()}</b>
                      <p className="text-[15px] text-ink-2 text-pretty">{m.onboarding_layout__nothing_lost_updates()}</p>
                    </div>
                    <div className="col-span-full flex flex-wrap gap-2">
                      <Button variant="bordered" size="compact" type="button" onClick={retry}>
                        
                        {m.app_not_running__try_again()}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <EmptyState icon={CheckCheck} title={m.shell_layout__caught_up_title()} text={m.shell_layout__caught_up_text()} />
                )}
              </div>
            ) : null}

            {panel === 'workspace' && WorkspaceAbout ? (
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 pt-5 pb-7">
                <WorkspaceAbout
                  pikku={<PanelRow icon={<Avatar mood="calm" size="xs" ring={false} />} title={m.onboarding_layout__pikku()} text={m.onboarding_layout__only_what_you_ask_it()} />}
                />
              </div>
            ) : null}

            {panel === 'workspace' && !WorkspaceAbout ? (
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 pt-5 pb-7">
                <div className="grid grid-cols-[auto_1fr] items-start gap-3 rounded-[18px] bg-secondary p-4">
                  <Avatar mood="calm" size="md" />
                  <p className="font-heading text-[17px] leading-[1.4] text-pretty">{m.shell_layout__where_work_lives()}</p>
                </div>
                <section className="flex flex-col gap-3.5">
                  <h3 className="text-[18px] font-bold tracking-[-0.012em] text-balance">{m.onboarding_layout__where_it_runs()}</h3>
                  <div className="flex items-start gap-3.5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-ink-2">
                      <Laptop className="size-5" />
                    </span>
                    <div>
                      <b className="block text-[16px]">{m.onboarding_layout__this_computer()}</b>
                      <p className="text-[15px] text-ink-2 text-pretty">{m.onboarding_layout__stored_here()}</p>
                    </div>
                  </div>
                </section>
                <section className="flex flex-col gap-3.5">
                  <h3 className="text-[18px] font-bold tracking-[-0.012em] text-balance">{m.onboarding_layout__who_sees()}</h3>
                  <div className="flex items-start gap-3.5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-ink-2">
                      <User className="size-5" />
                    </span>
                    <div>
                      <b className="block text-[16px]">{m.onboarding_layout__you()}</b>
                      <p className="text-[15px] text-ink-2 text-pretty">{m.onboarding_layout__you_text()}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3.5">
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-ink-2">
                      <ShieldCheck className="size-5" />
                    </span>
                    <div>
                      <b className="block text-[16px]">{m.onboarding_layout__nobody()}</b>
                      <p className="text-[15px] text-ink-2 text-pretty">{copy.nobodyElseText()}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3.5">
                    <span className="grid size-10 shrink-0 place-items-center">
                      <Avatar mood="calm" size="xs" ring={false} />
                    </span>
                    <div>
                      <b className="block text-[16px]">{m.parts__pikku()}</b>
                      <p className="text-[15px] text-ink-2 text-pretty">{m.shell_layout__pikku_scope()}</p>
                    </div>
                  </div>
                </section>
              </div>
            ) : null}
          </aside>

          {/* Pikku button and speech bubble */}
          <div className="absolute end-6 bottom-6 z-4 flex flex-col items-end gap-4 transition-all duration-420 ease-[cubic-bezier(.16,1,.3,1)] group-data-open/shell:end-114 @min-[1700px]/app:group-data-open/shell:end-126">
            {bubbleOpen ? (
              <section className="relative flex w-85 flex-col gap-3 rounded-card border border-border bg-card p-4 shadow-[0_6px_20px_-4px_rgba(8,40,52,0.16),0_2px_4px_rgba(8,40,52,0.06)]" aria-label={m.parts__pikku()} aria-live="polite">
                <span className="absolute -bottom-1.5 end-7 size-3 rotate-45 border-e border-b border-border bg-card" />
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-muted-foreground">{m.parts__pikku()}</span>
                  <button
                    type="button"
                    aria-label={m.shell_layout__dismiss()}
                    onClick={() => setBubbleOpen(false)}
                    className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <p className="font-heading text-[17px] leading-[1.32] font-medium text-foreground text-pretty">
                  {choose ? (
                    st === 'normal' ? (
                      <>{copy.bubbleAiPick()}</>
                    ) : st === 'empty' ? (
                      <>
                        <b>{m.onboarding_layout__b_only_one()}</b>
                        {sep(' ')}
                        {m.onboarding_layout__b_good_one()}
                      </>
                    ) : st === 'loading' ? (
                      <>{m.onboarding_layout__b_looking()}</>
                    ) : (
                      <>
                        {copy.bubbleAiDown()}
                        {sep(' ')}
                        <b>{m.onboarding_layout__b_try_again()}</b>
                      </>
                    )
                  ) : proj ? (
                    st === 'normal' ? (
                      <>
                        {m.onboarding_layout__b_picturing()}
                        {sep(' ')}
                        <b>{m.onboarding_layout__b_rough()}</b>
                        {sep(' ')}
                        {m.shell_layout__bubble_ask_first_build()}
                      </>
                    ) : st === 'empty' ? (
                      <>
                        {m.onboarding_layout__b_no_ideas()}
                        {sep(' ')}
                        <b>{m.onboarding_layout__b_own_words()}</b>
                        {sep(' ')}
                        {m.shell_layout__bubble_ask_first_build()}
                      </>
                    ) : st === 'loading' ? (
                      <>
                        {m.onboarding_layout__b_sketching()}
                        {sep(' ')}
                        <b>{m.onboarding_layout__b_ready()}</b>
                      </>
                    ) : (
                      <>
                        {m.onboarding_layout__b_did_not_work()}
                        {sep(' ')}
                        <b>{m.onboarding_layout__b_nothing_changed()}</b>
                        {sep(' ')}
                        {m.onboarding_layout__b_words_safe()}
                      </>
                    )
                  ) : !signIn ? (
                    <>
                      {m.onboarding_layout__b_this_step()}
                      {sep(' ')}
                      <b>{m.onboarding_layout__b_not_built()}</b>
                      {sep(' ')}
                      {m.onboarding_layout__b_go_back()}
                    </>
                  ) : st === 'empty' ? (
                    <>
                      {m.onboarding_layout__b_hi_i_am()}
                      {sep(' ')}
                      <b>{m.parts__pikku()}</b>
                      {sep(' ')}
                      {m.onboarding_layout__b_whole_way()}
                    </>
                  ) : st === 'normal' ? (
                    <>
                      {m.onboarding_layout__b_welcome()}
                      {sep(' ')}
                      <b>{m.onboarding_layout__b_as_left()}</b>
                    </>
                  ) : st === 'loading' ? (
                    <>{m.onboarding_layout__b_getting_ready()}</>
                  ) : (
                    <>
                      {m.onboarding_layout__b_did_not_load()}
                      {sep(' ')}
                      <b>{m.onboarding_layout__b_work_safe()}</b>
                      {sep(' ')}
                      {m.onboarding_layout__b_works_fine()}
                    </>
                  )}
                </p>
                {chips.length ? (
                  <div className="flex flex-wrap gap-2">
                    {chips.map(([label, yes, run]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={run}
                        className={`inline-flex h-10 items-center gap-2 rounded-full border-[1.5px] px-4 text-[14px] font-bold transition-colors duration-140 ${
                          yes
                            ? 'border-primary bg-primary text-primary-foreground hover:border-primary/90 hover:bg-primary/90'
                            : 'border-input bg-card hover:border-muted-foreground hover:bg-secondary'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                ) : null}
                <form
                  className="flex h-11 items-center gap-1 rounded-full border-[1.5px] border-input bg-background pe-1 ps-4 focus-within:border-primary"
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!bubbleDraft.trim()) return
                    {
                      const text = bubbleDraft.trim()
                      say(asI18n(text))
                    }
                    setBubbleDraft('')
                  }}
                >
                  <input
                    value={bubbleDraft}
                    onChange={(e) => setBubbleDraft(e.target.value)}
                    aria-label={m.explore_hub__ask_pikku()}
                    placeholder={m.shell_layout__ask_anything()}
                    className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground focus:outline-none"
                  />
                  <button type="submit" aria-label={m.parts__send()} className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                    <ArrowRight className="rtl:-scale-x-100 size-4.5" />
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => open('chat')}
                  className="inline-flex items-center gap-2 self-start rounded-sm py-1 text-[14px] font-bold text-accent-foreground hover:underline"
                >
                  <MessageCircle className="size-4.5" />
                  {m.parts__talk_to_pikku()}
                </button>
              </section>
            ) : null}
            <button
              type="button"
              aria-label={m.shell_layout__your_helper()}
              aria-expanded={bubbleOpen}
              onClick={() => setBubbleOpen(!bubbleOpen)}
              className="relative grid size-17 place-items-center rounded-full border border-border bg-card shadow-[0_6px_20px_-4px_rgba(8,40,52,0.16),0_2px_4px_rgba(8,40,52,0.06)] transition-transform duration-140 hover:-translate-y-0.5 active:scale-95"
            >
              <Avatar mood={mood} size="lg" />
            </button>
          </div>
        </div>
      </div>
    </OnbCtx.Provider>
  )
}
