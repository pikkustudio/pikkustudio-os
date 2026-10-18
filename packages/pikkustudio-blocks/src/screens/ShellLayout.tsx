import { asI18n, sep, type I18nNode, type I18nString } from '@pikku/react'
import { Blob, type BlobPoseName } from '../blocks/Blob'
import { PikkuMark } from '../blocks/PikkuMark'
import { ChangesPanel } from '../changes-panel/ChangesPanel'
import { CloudPanel } from '../blocks/CloudPanel'
import { EmptyState } from '../blocks/EmptyState'
import { NotFoundPage } from '../blocks/NotFoundPage'
import { Outlet, useLocation, useNavigate, useSearch } from '@tanstack/react-router'
import { Link } from '../blocks/Link'
import { useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react'
import { m } from '@/i18n/messages'
import { getLocale } from '@/paraglide/runtime.js'
import { languageName } from '../lib/i18n'
import { useProjectKey, useProjectMissing, useProjectName, useProjectSlug } from '../lib/project'
import { useAddonNav } from '../lib/addon-nav'
import { isTeamScoped, pageNeedsApp } from '../lib/project-url'
import { usePikkuChat } from '../lib/chat'
import { LocalAccountName, LocalShellAccount, LocalWorkspaceAbout, SignOutSection } from '../blocks/ShellAccount'
import { useSlots } from '../lib/slots'
import { useCopy } from '../lib/copy'
import { SCREEN_NAME, agentName } from '../lib/screen-names'
import { modeForPath, useBuilderChat } from '../lib/builder-chat'
import { usePageTitle } from '../lib/page-title'
import { useProjectQuery } from '../lib/projectRpc'
import { MOVABLE, usePins, type Movable } from '../lib/pins'
import { AttachedChips } from '../blocks/AttachedChips'
import { freeSelectionSlot, selectionColor } from '../lib/selection-colors'
import { ShellCtx, type AttachRef, type Attachment, type PanelId, type PublishNote, type View } from '../lib/shell'
import { keep } from '../lib/links'
import { ChatMarkdown } from '../blocks/ChatMarkdown'
import { AiSpinner } from '../blocks/Spinner'
import { Button } from '../ui/button'
import { SavedChats } from '../blocks/SavedChats'
import { FullTranscript } from '../blocks/FullTranscript'
import { QuickFind } from '../blocks/QuickFind'
import { SlashMenu, slashMatches, slashOptionId } from '../blocks/SlashMenu'
import { UpdatesFeed } from '../blocks/UpdatesFeed'
import { ProjectRunGate } from '../blocks/ProjectRunGate'
import { LocalProjectTargetProvider } from '../lib/project-target'
import { Toaster } from '../blocks/Toaster'
import { ComposerTools } from '../blocks/ComposerTools'
import { NoAiCard } from '../blocks/NoAiCard'
import { BuilderActivity } from '../blocks/BuilderActivity'
import { ChecksCard, MilestoneCard, OpenScreenCard } from '../blocks/BuilderCards'
import { useCanEdit, useProjectTarget } from '../lib/project-target'
import { useStickToBottom } from '../lib/stick-to-bottom'
import { useComposerExtras } from '../lib/composer-extras'
import { GitPullRequest, Archive, type LucideIcon, ArrowDown, ArrowLeft, ArrowRight, Bell, BookOpen, Check, CircleAlert, FileText, FolderOpen, Gauge, Globe, History, Home, Info, Compass, KeyRound, ListChecks, Search, Laptop, LayoutGrid, Mail, MessageCircle, MessageCircleQuestion, MousePointer2, Palette, Plus, ShieldCheck, Smartphone, Upload, PanelLeftClose, PanelLeftOpen, Menu, User, UserRoundCheck, Wrench, X, CheckCheck, ScrollText } from 'lucide-react'

// The app shell: rail, preview drawer (right edge), Pikku button + bubble, side panels.
// Every screen route is a child of this layout. Page content lives in the route files.






const item =
  'flex w-full items-center gap-3 rounded-lg px-3 group-data-[collapsed]/rail:justify-center group-data-[collapsed]/rail:px-0 text-start font-semibold no-underline transition-colors duration-140 hover:bg-secondary hover:text-foreground active:bg-surface-3'
const PIN_ICON: Record<Movable, LucideIcon> = { 'virtual-users': UserRoundCheck, translations: Globe, artifacts: FileText, content: FolderOpen, 'front-doors': Smartphone, audit: History, emails: Mail, knowledge: BookOpen, publish: Upload }
const pinLabel = (id: Movable): I18nString => ({ 'virtual-users': m.quick_find__virtual_users, translations: m.quick_find__translations, artifacts: SCREEN_NAME.artifacts, content: m.content__title, 'front-doors': m.front_doors__title, audit: m.quick_find__audit, emails: SCREEN_NAME.emails, knowledge: SCREEN_NAME.knowledge, publish: m.shell_layout__publish })[id]()
const navItem = `${item} h-9.25 text-[14px] text-ink-2 aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground`
const lbl = 'group-data-[collapsed]/rail:hidden'
const RAIL_KEY = 'studio.rail.collapsed'
const readCollapsed = () => {
  try {
    return localStorage.getItem(RAIL_KEY) === '1'
  } catch {
    return false
  }
}
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

const ASK_TONE = {
  info: { box: 'border-info', ic: 'bg-info text-white', label: 'text-info-foreground', hover: 'hover:border-info', badge: 'group-hover:bg-info group-hover:text-white', title: m.shell_layout__question_for_you },
  attention: { box: 'border-warning', ic: 'bg-warning text-on-warning', label: 'text-warning-foreground', hover: 'hover:border-warning', badge: 'group-hover:bg-warning group-hover:text-on-warning', title: m.shell_layout__question_needs_you },
  danger: { box: 'border-destructive', ic: 'bg-destructive text-white', label: 'text-destructive-foreground', hover: 'hover:border-destructive', badge: 'group-hover:bg-destructive group-hover:text-white', title: m.shell_layout__question_careful },
}

const KIND = {
  needs: { box: 'bg-card border-[1.5px] border-warning', ic: 'bg-warning text-on-warning', label: 'text-warning-foreground' },
  fyi: { box: '', ic: 'bg-info-soft text-info-foreground', label: 'text-info-foreground' },
  fixed: { box: '', ic: 'bg-success-soft text-success-foreground', label: 'text-success-foreground' },
}

function Note({
  kind,
  icon: Icon,
  label,
  time,
  title,
  text,
  read,
  indent,
  roomy,
  children,
}: {
  kind: keyof typeof KIND
  icon: ComponentType<{ className?: string }>
  label: I18nString
  time?: I18nString
  title: I18nString
  text: I18nString
  read?: boolean
  indent?: boolean
  roomy?: boolean
  children?: I18nNode
}) {
  const k = KIND[kind]
  return (
    <article
      className={`flex flex-col rounded-card border border-border bg-card shadow-card ${roomy ? 'gap-4 px-8.5 py-7.5' : 'gap-2 p-4.5'} ${k.box} ${read ? 'opacity-70' : ''} ${indent ? 'ms-12' : ''}`}
    >
      <div className="flex items-center gap-2.5">
        <span className={`grid size-9.5 shrink-0 place-items-center rounded-lg ${k.ic}`}>
          <Icon className="size-5.25" />
        </span>
        <span className={`text-[14px] font-bold ${k.label}`}>{label}</span>
        <span className="ms-auto text-[13px] text-muted-foreground">{time}</span>
      </div>
      <h3 className="font-sans text-[17px] leading-[1.3] font-bold tracking-normal text-balance">{title}</h3>
      <p className="text-[15px] leading-[1.5] text-ink-2 text-pretty">{text}</p>
      {children ? <div className="mt-1.5 flex flex-wrap gap-2">{children}</div> : null}
    </article>
  )
}

export function ShellLayout() {
  const Target = useSlots().ProjectTargetProvider ?? LocalProjectTargetProvider
  return (
    <Target>
      <ShellLayoutInner />
    </Target>
  )
}

function ShellLayoutInner() {
  const projectName = useProjectName()
  const projectSlug = useProjectSlug()
  const projectMissing = useProjectMissing()
  const addonNav = useAddonNav()
  const slots = useSlots()
  const copy = useCopy()
  const Account = slots.ShellAccount ?? LocalShellAccount
  const About = slots.WorkspaceAbout ?? LocalWorkspaceAbout
  const AccountName = slots.AccountName ?? LocalAccountName
  const navigate = useNavigate()
  const q = useSearch({ strict: false }) as { view?: View; look?: 'light' | 'dark'; panel?: PanelId; show?: 'done'; project?: string; change?: string }
  const path = useLocation({ select: (l) => l.pathname })
  const project = useLocation({ select: (l) => (l.search as { project?: string }).project })
  // Only a team's pages need a project; leaving for a page outside any team (profile, account, sign-in) must not bounce back.
  const needsProject = !project && isTeamScoped(path) && !/\/(projects|secrets|account|studio-metrics|new-project|sign-in|your-name|choose-ai)$/.test(path) && !/^\/admin(\/|$)/.test(path)
  useEffect(() => {
    if (needsProject) navigate({ to: '/projects', search: ((prev: object) => prev) as never, replace: true })
  }, [needsProject])
  const panel: PanelId | '' = q.panel ?? ''
  const set = (patch: Record<string, unknown>) =>
    navigate({ to: '.', search: ((prev: object) => ({ ...prev, ...patch })) as never, replace: true })
  const setPanel = (id: PanelId | '') => set({ panel: id || undefined })
  const [find, setFind] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const toggleRail = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(RAIL_KEY, c ? '0' : '1')
      } catch {}
      return !c
    })
  const [navOpen, setNavOpen] = useState(false)
  useEffect(() => setNavOpen(false), [path])
  useEffect(() => {
    if (!navOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setNavOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navOpen])
  const tip = (label: I18nString) => (collapsed ? { title: label, 'aria-label': label } : {})
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setFind((f) => !f)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
  const [draft, setDraft] = useState('')
  const [slashAt, setSlashAt] = useState(0)
  const [slashOff, setSlashOff] = useState(false)
  const slash = slashOff ? [] : slashMatches(draft)
  const slashIdx = Math.min(slashAt, Math.max(slash.length - 1, 0))
  const [bubbleDraft, setBubbleDraft] = useState('')
  const projectKey = useProjectKey()
  const composerRef = useRef<HTMLTextAreaElement>(null)
  const extras = useComposerExtras(projectKey)
  const dictate = (text: string) => {
    const field = composerRef.current
    const at = field?.selectionStart ?? draft.length
    const end = field?.selectionEnd ?? at
    const before = draft.slice(0, at)
    const glue = before && !/\s$/.test(before) ? ' ' : ''
    setDraft(before + glue + text + draft.slice(end))
    const caret = (before + glue + text).length
    requestAnimationFrame(() => {
      field?.focus()
      field?.setSelectionRange(caret, caret)
    })
  }
  const workMode = useLocation({ select: (l) => modeForPath(l.pathname) })
  const [saved, setSaved] = useState<{ open: string | null } | null>(null)
  const [full, setFull] = useState(() => {
    try {
      return localStorage.getItem('studio.chat.full') === '1'
    } catch {
      return false
    }
  })
  const toggleFull = () =>
    setFull((on) => {
      try {
        localStorage.setItem('studio.chat.full', on ? '0' : '1')
      } catch {}
      return !on
    })
  const pageTitle = usePageTitle()
  const guide = usePikkuChat(projectKey, pageTitle)
  const builder = useBuilderChat(projectKey, workMode)
  const canEdit = useCanEdit()
  const ChatPublishStatus = slots.ChatPublishStatus
  const { openWorkspace } = useProjectTarget()
  const chat = workMode ? builder : guide
  const changesQ = useProjectQuery<{ changes: { changeId: string; title: string; body: string | null; status: string; createdAt: string }[] }>(projectKey, 'console:listStudioChanges', { status: ['open', 'claimed', 'needs_answer', 'in_progress'] }, { refetchInterval: 6000 })
  const pending = (changesQ.data?.changes ?? []).map((c) => {
    const title = asI18n(c.title)
    const text = c.body
    return { ...c, title, body: text === null ? null : asI18n(text) }
  })
  const view: View = pending.length ? 'problem' : 'healthy'
  const paidNow = false
  const when = (iso: string): I18nString => {
    const text = new Date(iso).toLocaleString(getLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
    return asI18n(text)
  }
  const [attached, setAttached] = useState<Attachment[]>([])
  const attach = (label: I18nString, ref?: AttachRef) => {
    setAttached((a) => {
      if (a.some((x) => x.label === label)) return a
      const slot = freeSelectionSlot(a.map((x) => x.slot))
      return [...a, { label, text: ref?.text ?? label, meta: ref?.meta ?? label, where: ref?.where ?? label, omId: ref?.omId ?? '', omIndex: ref?.omIndex ?? 0, slot, color: selectionColor(slot) }]
    })
    setPanel('chat')
  }
  const detach = (label: I18nString) => setAttached((a) => a.filter((x) => x.label !== label))
  const fill = useLocation({ select: (l) => /\/(design|artifacts\/[^/]+|routines\/[^/]+)$/.test(l.pathname) || (l.pathname.endsWith('/emails') && !!(l.search as { email?: string }).email) })
  const needsApp = useLocation({ select: (l) => pageNeedsApp(l.pathname) })
  const onArtifacts = useLocation({ select: (l) => l.pathname.endsWith('/artifacts') })
  const onKnowledge = useLocation({ select: (l) => l.pathname.endsWith('/knowledge') })
  const onPublish = useLocation({ select: (l) => l.pathname.endsWith('/publish') })
  const onProject = useLocation({ select: (l) => l.pathname.endsWith('/project') })
  const { pins } = usePins()
  const onEmails = useLocation({ select: (l) => l.pathname.endsWith('/emails') })
  const [pub, setPublish] = useState<PublishNote | null>(null)
  const [dismissed, setDismissed] = useState<string | null>(null)
  const [bubbleOpen, setBubbleOpen] = useState<boolean | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanel('')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const approve = () => setPanel('updates')
  const lastAsked = chat.items.reduce<string | undefined>((found, it) => (it.kind === 'me' ? it.text : found), undefined)
  // Only the latest no-AI failure gets the sign-in card; earlier repeats are dropped.
  const lastNoAi = chat.items.reduce<string | undefined>((found, it) => (it.kind === 'error' && it.noAi ? it.id : found), undefined)
  const log = useStickToBottom<HTMLDivElement>()
  const say = (text: I18nString) => {
    setPanel('chat')
    log.toBottom()
    if (!canEdit && (workMode || /^\/experiment\b/.test(text))) return
    if (!workMode && /^\/experiment\s+\S/.test(text)) {
      void builder.send(text)
      navigate({ to: '/artifacts', search: ((prev: object) => prev) as never })
      return
    }
    void chat.send(text)
  }
  const pikkuSays = (text: I18nString) => {
    setPanel('chat')
    chat.push({ kind: 'pikku', text })
  }

  const needsCount = pending.length + (pub && pub.state !== 'live' ? 1 : 0)
  const mood: Mood = pending.length ? 'ask' : 'calm'
  const needsPerson = pending.length > 0
  const bubbleKey = pending.map((c) => c.changeId).join(',')
  const isDismissed = dismissed === bubbleKey
  const bubbleIsOpen = bubbleOpen ?? false
  const [helperHot, setHelperHot] = useState(false)
  const unread = needsPerson && isDismissed

  const panelTitle: Record<PanelId, I18nString> = { chat: workMode ? agentName(workMode) : m.parts__talk_to_pikku(), updates: m.shell_layout__updates(), changes: m.shell_layout__changes(), workspace: m.shell_layout__your_workspace(), account: m.shell_layout__your_account(), pitch: m.cloud_panel__title() }
  const aboutScreen: I18nString | null = onEmails || fill ? null : onArtifacts ? SCREEN_NAME.artifacts() : onKnowledge ? SCREEN_NAME.knowledge() : onProject ? SCREEN_NAME.project() : onPublish ? m.shell_layout__publish() : (pageTitle ?? null)
  const bubbleActions: { label: I18nString; yes: boolean; run: () => void }[] = pending.length
    ? [
        { label: m.shell_layout__tell_me_more(), yes: true, run: () => setPanel('updates') },
        { label: m.shell_layout__not_now(), yes: false, run: () => pikkuSays(m.shell_layout__not_now_reply()) },
      ]
    : [
        { label: m.shell_layout__describe_my_app(), yes: true, run: () => setPanel('chat') },
        { label: m.shell_layout__give_me_an_example(), yes: false, run: () => say(m.shell_layout__give_me_an_example_of()) },
      ]
  const tabs = panel === 'chat' || panel === 'updates' || panel === 'changes'
  const tab =
    '-mb-px inline-flex h-11.5 items-center gap-2 rounded-t-[10px] border-b-3 px-3.5 text-[15px] font-bold transition-colors duration-140 hover:bg-secondary hover:text-foreground active:bg-surface-3'

  if (needsProject) return null

  return (
    <ShellCtx.Provider value={{ view, pending, paid: paidNow, approve, say, open: setPanel, pikkuSays, attached, attach, detach, setPublish, openFind: () => setFind(true) }}>
      <div
        className="@container/app fixed inset-0 z-0 overflow-hidden bg-background font-sans text-[16px] leading-[1.5] text-foreground antialiased"
      >

        <div className="group/shell relative flex h-full overflow-hidden" data-open={panel !== '' ? '' : undefined}>
          {/* Rail */}
          {navOpen ? <button type="button" aria-label={m.shell_layout__close_nav()} onClick={() => setNavOpen(false)} className="fixed inset-0 z-55 hidden bg-foreground/30 @max-[640px]/app:block" /> : null}
          <aside
            data-collapsed={collapsed ? '' : undefined}
            data-nav-open={navOpen ? '' : undefined}
            id="studio-rail"
            className="group/rail flex min-h-0 w-63 shrink-0 @max-[640px]/app:fixed @max-[640px]/app:inset-y-0 @max-[640px]/app:start-0 @max-[640px]/app:z-60 @max-[640px]/app:max-w-[85vw] @max-[640px]/app:shadow-xl @max-[640px]/app:not-data-[nav-open]:hidden flex-col gap-3.5 overflow-x-hidden overflow-y-auto border-e border-border bg-muted px-4 py-5 transition-[width,padding] duration-200 ease-out motion-reduce:transition-none data-[collapsed]:w-16 data-[collapsed]:px-2 @min-[1700px]/app:w-70 @min-[1700px]/app:data-[collapsed]:w-16"
            aria-label={m.shell_layout__studio()}
          >
            <button type="button" onClick={() => setNavOpen(false)} aria-label={m.shell_layout__close_nav()} className={`${iconBtn} hidden self-end @max-[640px]/app:grid`}>
              <X className="size-5" />
            </button>
            <Link {...keep} to="/overview" className="flex items-center gap-2.5 px-2 py-1 font-heading text-[24px] font-extrabold tracking-[-0.02em] no-underline group-data-[collapsed]/rail:justify-center group-data-[collapsed]/rail:px-0">
              <PikkuMark label={m.shell_layout__studio()} />
              <span className={lbl}>{m.shell_layout__studio()}</span>
            </Link>
            <Button asChild variant="default" size="page" className="mx-1 group-data-[collapsed]/rail:mx-auto group-data-[collapsed]/rail:size-11 group-data-[collapsed]/rail:px-0">
              <Link {...keep} to="/new-project" {...tip(m.shell_layout__new_project())}>
              <Plus className="size-4.5" />
              <span className={lbl}>{m.shell_layout__new_project()}</span>
            </Link>
            </Button>
            <button
              type="button"
              onClick={() => setFind(true)}
              {...tip(m.shell_layout__find_a_page())}
              className="mx-1 flex h-11.5 shrink-0 items-center gap-2.5 rounded-full border border-input bg-card px-5.5 text-start text-px15 text-muted-foreground transition-colors duration-140 hover:bg-secondary group-data-[collapsed]/rail:mx-auto group-data-[collapsed]/rail:size-11 group-data-[collapsed]/rail:justify-center group-data-[collapsed]/rail:px-0"
            >
              <Search className="size-4.5 shrink-0" />
              <span className={`flex-1 truncate font-bold ${lbl}`}>{m.shell_layout__find_a_page()}</span>
              <kbd className={`rounded-md border border-border px-1.5 text-[12px] ${lbl}`}>{m.shell_layout__find_shortcut()}</kbd>
            </button>
            <nav className="flex flex-col gap-0.5" aria-label={m.shell_layout__main()}>
              <Link {...keep} {...tip(m.shell_layout__home())} to="/projects" className={`${item} h-11.5 text-[15px] text-ink-2 aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground`}>
                <Home className="size-5.5" />
                <span className={lbl}>{m.shell_layout__home()}</span>
              </Link>
              <Link {...keep} {...tip(m.shell_layout__studio_metrics())} to={'/studio-metrics' as never} className={`${item} h-11.5 text-[15px] text-ink-2 aria-[current=page]:bg-accent aria-[current=page]:text-accent-foreground`}>
                <Gauge className="size-5.5" />
                <span className={lbl}>{m.shell_layout__studio_metrics()}</span>
              </Link>
            </nav>
            {addonNav ? (
              <div className="flex flex-col gap-0.5 px-1">
                <Link {...keep} {...tip(addonNav.back ? asI18n(addonNav.back.label) : m.shell_layout__back_to({ project: projectName }))} to={(addonNav.back?.to ?? '/overview') as never} className={`${navItem} mb-1`}>
                  <ArrowLeft className="rtl:-scale-x-100 size-5" />
                  <span className={lbl}>{addonNav.back ? asI18n(addonNav.back.label) : m.shell_layout__back_to({ project: projectName })}</span>
                </Link>
                <div className={`mb-1.5 px-3 text-[13px] font-semibold text-muted-foreground ${lbl}`}>{asI18n(addonNav.title)}</div>
                {addonNav.items.map((n) => (
                  <Link {...keep} {...tip(asI18n(n.label))} key={n.splat} to={(n.to ?? '/addons/$') as never} params={(n.to ? undefined : { _splat: n.splat }) as never} activeOptions={{ exact: true }} aria-current={n.splat === addonNav.current || (!n.to && n.splat.includes('/') && addonNav.current.startsWith(`${n.splat}/`)) ? 'page' : 'false'} className={navItem}>
                    <LayoutGrid className="size-5" />
                    <span className={lbl}>{asI18n(n.label)}</span>
                  </Link>
                ))}
              </div>
            ) : /\/studio-metrics$/.test(path) || !projectSlug || projectMissing ? null : (
            <div className="flex flex-col gap-0.5 px-1">
              <div className={`mb-1.5 px-3 text-[13px] font-semibold text-muted-foreground ${lbl}`}>{projectName}</div>
              {slots.ProjectTargetSwitcher ? <slots.ProjectTargetSwitcher collapsed={collapsed} /> : null}
              <Link {...keep} {...tip(m.shell_layout__explore())} to={'/explore' as never} className={navItem}>
                <Compass className="size-5" />
                <span className={lbl}>{m.shell_layout__explore()}</span>
              </Link>
              <Link {...keep} {...tip(SCREEN_NAME.project())} to={'/project' as never} className={navItem} data-testid="nav-project">
                <ListChecks className="size-5" />
                <span className={lbl}>{SCREEN_NAME.project()}</span>
              </Link>
              <Link {...keep} {...tip(m.shell_layout__overview())} to="/overview" className={navItem}>
                <LayoutGrid className="size-5" />
                <span className={lbl}>{m.shell_layout__overview()}</span>
              </Link>
              <Link {...keep} {...tip(m.shell_layout__changes())} to={'/changes' as never} className={navItem}>
                <GitPullRequest className="size-5" />
                <span className={lbl}>{m.shell_layout__changes()}</span>
              </Link>
              <Link {...keep} {...tip(SCREEN_NAME.frontend())} to="/design" className={navItem}>
                <Palette className="size-5" />
                <span className={lbl}>{SCREEN_NAME.frontend()}</span>
              </Link>
              {MOVABLE.filter((id) => pins.includes(id)).map((id) => {
                const Icon = PIN_ICON[id]
                return (
                  <Link {...keep} {...tip(pinLabel(id))} key={id} to={`/${id}` as never} className={navItem}>
                    <Icon className="size-5" />
                    <span className={lbl}>{pinLabel(id)}</span>
                  </Link>
                )
              })}
              {slots.ProjectNav ? <slots.ProjectNav itemClass={navItem} labelClass={lbl} collapsed={collapsed} /> : null}
            </div>
            )}
            <div className="mt-auto flex flex-col gap-2.5">
              {slots.RailFoot ? <slots.RailFoot collapsed={collapsed} /> : null}
              <button
                type="button"
                onClick={toggleRail}
                aria-expanded={!collapsed}
                aria-label={collapsed ? m.shell_layout__expand_nav() : m.shell_layout__collapse_nav()}
                title={collapsed ? m.shell_layout__expand_nav() : m.shell_layout__collapse_nav()}
                className="flex h-9.25 w-full items-center gap-3 rounded-lg px-3 text-start text-[14px] font-semibold text-ink-2 transition-colors duration-140 hover:bg-secondary hover:text-foreground active:bg-surface-3 group-data-[collapsed]/rail:justify-center group-data-[collapsed]/rail:px-0 @max-[640px]/app:hidden"
              >
                {collapsed ? <PanelLeftOpen className="size-5 rtl:-scale-x-100" /> : <PanelLeftClose className="size-5 rtl:-scale-x-100" />}
                <span className={lbl}>{m.shell_layout__collapse_nav()}</span>
              </button>
              {collapsed ? (
                <button type="button" onClick={() => setPanel('workspace')} {...tip(m.shell_layout__your_workspace())} className={`${iconBtn} mx-auto`}>
                  <Laptop className="size-5.5" />
                </button>
              ) : (
                <Account expanded={panel === 'workspace'} onOpen={() => setPanel('workspace')} onAccount={() => navigate({ to: '/account', search: ((prev: object) => ({ ...prev, panel: undefined })) as never })} />
              )}
            </div>
          </aside>

          {/* Page area */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col pe-0 transition-all duration-420 ease-[cubic-bezier(.16,1,.3,1)] group-data-open/shell:pe-102 @min-[1700px]/app:group-data-open/shell:pe-120 [:root:has([data-side-panel])_&]:pe-102 @min-[1700px]/app:[:root:has([data-side-panel])_&]:pe-120 @max-[640px]/app:pe-0">
            <div className="hidden items-center gap-2 border-b border-border bg-muted px-3 py-2 @max-[640px]/app:flex">
              <button type="button" onClick={() => setNavOpen(true)} aria-label={m.shell_layout__open_nav()} aria-expanded={navOpen} aria-controls="studio-rail" className={iconBtn}>
                <Menu className="size-5.5" />
              </button>
              <Link {...keep} to="/overview" className="flex items-center gap-2 font-heading text-[20px] font-extrabold tracking-[-0.02em] no-underline">
                <PikkuMark label={m.shell_layout__studio()} />
                <span>{m.shell_layout__studio()}</span>
              </Link>
            </div>
            <div className={`min-h-0 flex-1 ${fill ? 'overflow-hidden pt-4 pe-6.5 pb-3.5 ps-6' : 'overflow-auto scroll-smooth [scrollbar-width:thin] px-12 pt-9 pb-7 @max-[640px]/app:px-4 @max-[640px]/app:pt-5 @min-[1700px]/app:px-16 @min-[1700px]/app:pt-11 @min-[1700px]/app:pb-8'}`}>
              {projectMissing ? (
                <NotFoundPage />
              ) : needsApp ? (
                <ProjectRunGate>
                  <Outlet />
                </ProjectRunGate>
              ) : (
                <Outlet />
              )}
            </div>
          </div>

          <Toaster />

          {find ? <QuickFind onClose={() => setFind(false)} onAsk={say} /> : null}

          {/* Side panel: Chat, Updates, This workspace */}
          <aside
            aria-hidden={panel === ''}
            className={`absolute inset-y-0 end-0 z-5 flex w-102 max-w-full flex-col border-s border-border bg-card shadow-[0_24px_56px_-14px_rgba(8,40,52,0.35)] transition-all duration-420 ease-[cubic-bezier(.16,1,.3,1)] @min-[1700px]/app:w-120 ${panel !== '' ? 'visible translate-x-0' : 'invisible translate-x-full rtl:-translate-x-full'}`}
          >
            <div className="flex items-center gap-0.5 pt-4 pe-3 pb-2.5 ps-6">
              <h2 className="flex-1 text-[24px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">{panel ? panelTitle[panel] : null}</h2>
              <button type="button" aria-label={m.shell_layout__close_panel()} onClick={() => setPanel('')} className={iconBtn}>
                <X className="size-5.5" />
              </button>
            </div>

            {tabs ? (
              <div className="flex gap-1 border-b border-border px-5" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={panel === 'chat'}
                  onClick={() => setPanel('chat')}
                  className={`${tab} ${panel === 'chat' ? 'border-primary text-accent-foreground' : 'border-transparent text-ink-2'}`}
                >
                  <MessageCircle className="size-4.5" />
                  {m.shell_layout__chat()}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={panel === 'updates'}
                  onClick={() => setPanel('updates')}
                  className={`${tab} ${panel === 'updates' ? 'border-primary text-accent-foreground' : 'border-transparent text-ink-2'}`}
                >
                  <Bell className="size-4.5" />
                  {m.shell_layout__updates()}
                  {needsCount ? (
                    <span className="grid h-5.5 min-w-5.5 place-items-center rounded-full bg-warning px-1.5 text-[13px] font-bold text-on-warning">
                      {needsCount}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={panel === 'changes'}
                  onClick={() => setPanel('changes')}
                  className={`${tab} ${panel === 'changes' ? 'border-primary text-accent-foreground' : 'border-transparent text-ink-2'}`}
                >
                  <GitPullRequest className="size-4.5" />
                  {m.shell_layout__changes()}
                </button>
              </div>
            ) : null}
            {panel === 'changes' ? <ChangesPanel /> : null}
            {panel === 'updates' ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-auto px-6 pt-5 pb-7">
                <div className="flex flex-col gap-3.5">
                    {pub?.state === 'error' ? (
                      <Note kind="needs" icon={CircleAlert} label={m.shell_layout__needs_you()} time={m.shell_layout__just_now()} title={m.copy__publish_failed_title()} text={copy.publishFailedText()}>
                        <Button variant="default" size="compact" type="button" onClick={() => pub.act('publish')}>
                          
                          {m.app_not_running__try_again()}
                        </Button>
                        <Button variant="bordered" size="compact" type="button" onClick={() => say(pub.ask)}>
                          
                          {m.explore_hub__ask_pikku()}
                        </Button>
                      </Note>
                    ) : null}
                    {pub?.state === 'signin' ? (
                      <Note kind="needs" icon={CircleAlert} label={m.shell_layout__needs_you()} time={m.shell_layout__just_now()} title={copy.publishSignInTitle()} text={copy.publishSignInText()}>
                        <Button variant="default" size="compact" type="button" onClick={() => pub.act('signin')}>
                          {copy.publishSignInButton()}
                        </Button>
                      </Note>
                    ) : null}
                    {pub?.state === 'live' ? (
                      <Note kind="fyi" icon={Info} label={m.shell_layout__good_to_know()} time={m.shell_layout__just_now()} title={m.shell_layout__your_app_is_live()} text={m.shell_layout__people_can_now_open_and({ url: pub.url })} />
                    ) : null}
                    {pending.map((c) => (
                      <Note key={c.changeId} kind={c.status === 'in_progress' ? 'fyi' : 'needs'} icon={c.status === 'in_progress' ? Info : CircleAlert} label={c.status === 'in_progress' ? m.shell_layout__pikku_is_on_it() : m.shell_layout__needs_you()} time={when(c.createdAt)} title={c.title} text={c.body ?? m.shell_layout__no_details()}>
                        <Button variant="default" size="compact" type="button" onClick={() => say(m.overview_screen__look_say({ title: c.title }))}>
                          
                          {m.shell_layout__ask_pikku_about_it()}
                        </Button>
                      </Note>
                    ))}
                  </div>
                {!pending.length && !pub ? (
                  <EmptyState icon={CheckCheck} title={m.shell_layout__caught_up_title()} text={m.shell_layout__caught_up_text()} />
                ) : null}
                <section className="mt-5 flex flex-col gap-3.5 border-t border-border pt-5">
                  <h3 className="text-[18px] font-bold tracking-[-0.012em] text-balance">{m.shell_layout__what_has_happened()}</h3>
                  <UpdatesFeed projectKey={projectKey} />
                </section>
              </div>
            ) : null}

            {panel === 'chat' ? (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="flex items-center gap-2 border-b border-border bg-secondary px-6 py-3 text-[14px] text-ink-2">
                  <FolderOpen className="size-4.5 text-accent-foreground" />
                  <span className="font-semibold text-muted-foreground">{m.shell_layout__about()}</span>
                  <b className="min-w-0 flex-1 truncate text-foreground">{projectName}{aboutScreen ? <>{sep(', ')}{aboutScreen}</> : null}</b>
                  {workMode ? (
                    <>
                      <Button variant={full ? 'bordered' : 'ghost'} size="textTight" type="button" aria-pressed={full} title={m.builder_chat__full_hint()} onClick={toggleFull} data-testid="chat-full-toggle">
                        <ScrollText className="size-4" />
                        {m.builder_chat__full()}
                      </Button>
                      <Button variant="ghost" size="textTight" type="button" onClick={() => setSaved({ open: null })}>
                        <History className="size-4" />
                        {m.builder_chat__saved_chats()}
                      </Button>
                      <Button variant="ghost" size="textTight" type="button" disabled={!builder.canArchive} title={builder.busy ? m.builder_chat__busy_hint() : m.builder_chat__archive_hint()} onClick={() => void builder.archive()}>
                        <Archive className="size-4" />
                        {m.builder_chat__archive()}
                      </Button>
                    </>
                  ) : null}
                </div>
                {saved && workMode ? (
                  <SavedChats projectKey={projectKey} openId={saved.open} onOpen={(open) => setSaved({ open })} onClose={() => setSaved(null)} avatar={<Avatar mood="calm" size="sm" />} />
                ) : (
                <>
                <div className="relative flex min-h-0 flex-1 flex-col">
                <div ref={log.ref} className="flex min-h-0 flex-1 flex-col gap-4.5 overflow-auto px-6 py-5" tabIndex={0} aria-label={m.shell_layout__chat()} role="log">
                  {full && workMode ? <FullTranscript items={builder.raw} busy={builder.busy} avatar={<Avatar mood="calm" size="sm" />} /> : null}
                  {(full && workMode ? [] : chat.items).map((it) =>
                    it.kind === 'me' ? (
                      <div key={it.id} className="flex min-w-0 items-start justify-end gap-3">
                        <div className="flex max-w-5/6 min-w-0 flex-col gap-2 rounded-t-[18px] rounded-es-[18px] rounded-ee-[4px] bg-accent px-4 py-2.5 text-[16px] leading-[1.5] text-foreground">
                          {asI18n(it.text)}
                        </div>
                      </div>
                    ) : it.kind === 'error' && it.noAi ? (
                      it.id === lastNoAi ? <NoAiCard key={it.id} onRetry={lastAsked ? () => say(asI18n(lastAsked)) : undefined} /> : null
                    ) : it.kind === 'error' ? (
                      <div key={it.id} className="flex flex-col gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-[14px]">
                        <div className="flex items-center gap-2">
                          <CircleAlert className="size-4 shrink-0 text-warning-foreground" />
                          <span className="font-semibold">{m.shell_layout__error_label()}</span>
                          {it.retry ? (
                            <Button variant="bordered" size="chip" className="ms-auto" type="button" disabled={chat.busy || !lastAsked} onClick={() => lastAsked && say(asI18n(lastAsked))}>
                              {m.query_state__try_again()}
                            </Button>
                          ) : null}
                        </div>
                        {it.detail ? (
                          <details className="text-ink-2">
                            <summary className="cursor-pointer text-[13px]">{m.shell_layout__error_details()}</summary>
                            <pre className="mt-1.5 max-h-48 overflow-auto rounded-lg bg-secondary p-2.5 text-[12px] leading-snug whitespace-pre-wrap">{it.detail}</pre>
                          </details>
                        ) : null}
                      </div>
                    ) : it.kind === 'open' ? (
                      <OpenScreenCard key={it.id} screen={it.screen} title={it.title} />
                    ) : it.kind === 'milestone' ? (
                      <MilestoneCard key={it.id} title={it.title} />
                    ) : it.kind === 'checks' ? (
                      <ChecksCard key={it.id} output={it.output} busy={chat.busy || !canEdit} onFix={() => say(m.builder_cards__checks_say())} />
                    ) : it.kind === 'card' && it.options && it.state === 'ask' ? (
                      <article key={it.id} className={`flex flex-col gap-3 rounded-card border-[1.5px] bg-card p-4.5 shadow-card ${ASK_TONE[it.tone ?? 'info'].box}`} data-testid="ask-card">
                        <div className="flex items-center gap-2.5">
                          <span className={`grid size-9.5 shrink-0 place-items-center rounded-lg ${ASK_TONE[it.tone ?? 'info'].ic}`}>
                            <MessageCircleQuestion className="size-5.25" />
                          </span>
                          <span className={`text-[14px] font-bold ${ASK_TONE[it.tone ?? 'info'].label}`}>{ASK_TONE[it.tone ?? 'info'].title()}</span>
                        </div>
                        <h3 className="font-sans text-[18px] leading-[1.3] font-bold tracking-normal text-balance">{it.title}</h3>
                        {it.options.length ? (
                          <ul className="flex flex-col gap-2" data-testid="ask-options">
                            {it.options.map((o, n) => (
                              <li key={o}>
                                <button type="button" disabled={chat.busy} onClick={() => say(o)} className={`group flex w-full cursor-pointer items-center gap-3 rounded-xl border-[1.5px] border-input px-3.5 py-3 text-start text-[15px] leading-[1.4] text-foreground transition-colors hover:bg-secondary ${ASK_TONE[it.tone ?? 'info'].hover} focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-default disabled:opacity-45`}>
                                  <span className={`grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-[13px] font-semibold text-ink-2 ${ASK_TONE[it.tone ?? 'info'].badge}`}>{n + 1}</span>
                                  <span className="min-w-0 flex-1 text-pretty">{o}</span>
                                  <ArrowRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 rtl:-scale-x-100" />
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <p className="text-[13px] text-muted-foreground">{it.options.length ? m.shell_layout__ask_hint_options() : m.shell_layout__ask_hint_type()}</p>
                        {it.skip ? (
                          <div>
                            <Button variant="ghost" size="compactTight" type="button" disabled={chat.busy} onClick={() => void builder.skipQuestion()} data-testid="ask-skip">
                              {m.project_flow__skip_question()}
                            </Button>
                          </div>
                        ) : null}
                      </article>
                    ) : it.kind === 'card' ? (
                      <Note key={it.id} kind={it.state === 'ask' ? 'needs' : 'fixed'} icon={it.state === 'ask' ? CircleAlert : Check} label={it.state === 'ask' ? m.shell_layout__needs_you() : it.state === 'declined' ? m.shell_layout__left_alone() : it.state === 'working' ? m.shell_layout__working_on_it() : m.shell_layout__done()} title={it.title} text={it.detail}>
                        {it.state === 'ask' ? (
                          <>
                            <Button variant="default" size="compact" type="button" onClick={() => void chat.decide(it.id, true)}>
                              {it.yes ?? m.shell_layout__approve()}
                            </Button>
                            <Button variant="ghost" size="compactTight" type="button" onClick={() => void chat.decide(it.id, false)}>
                              {it.no ?? m.shell_layout__not_now()}
                            </Button>
                          </>
                        ) : null}
                      </Note>
                    ) : it.quiet ? (
                      <p key={it.id} className="flex items-center gap-2 ps-12 text-[13px] text-muted-foreground" data-testid="progress-note">
                        <span className="size-1.5 shrink-0 rounded-full bg-muted-foreground/60" aria-hidden="true" />
                        {it.text}
                      </p>
                    ) : (
                      <div key={it.id} className="flex min-w-0 items-start gap-3" data-testid="chat-reply">
                        <span className="mt-0.5">
                          <Avatar mood="calm" size="sm" />
                        </span>
                        <div className="flex min-w-0 flex-col gap-2 text-[16px] leading-[1.5] text-foreground">
                          {it.agent ? <small className="text-[12px] font-semibold text-muted-foreground" data-testid="chat-agent">{it.agent}</small> : null}
                          <ChatMarkdown>{it.text}</ChatMarkdown>
                        </div>
                      </div>
                    ),
                  )}
                  {workMode && builder.activity ? (
                    <BuilderActivity since={builder.activity.since} doing={builder.activity.doing} canStop={builder.canStop && canEdit} stopping={builder.stopping} onStop={() => void builder.stop()} />
                  ) : chat.busy && !chat.items.some((i) => i.kind === 'pikku' && !i.text) ? <p className="flex items-center gap-2 text-[14px] text-muted-foreground">
                      <AiSpinner />
                      {m.shell_layout__thinking()}
                    </p> : null}
                </div>
                {log.atBottom ? null : (
                  <button
                    type="button"
                    onClick={log.toBottom}
                    aria-label={m.shell_layout__to_latest()}
                    title={m.shell_layout__to_latest()}
                    className="absolute bottom-3 left-1/2 grid size-10 -translate-x-1/2 cursor-pointer place-items-center rounded-full border border-border bg-card text-foreground shadow-card hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    data-testid="chat-to-latest"
                  >
                    <ArrowDown className="size-5" aria-hidden="true" />
                  </button>
                )}
                </div>
                {ChatPublishStatus && projectKey ? <ChatPublishStatus projectKey={projectKey} /> : null}
                {workMode && !canEdit ? (
                  <div className="flex flex-wrap items-center gap-3 border-t border-border bg-card px-5 py-3.5" role="status" data-testid="chat-read-only">
                    <p className="min-w-0 flex-1 text-[14px] text-ink-2">{m.builder_chat__stage_read_only()}</p>
                    {openWorkspace ? (
                      <Button variant="default" size="compact" type="button" onClick={openWorkspace}>
                        {m.builder_chat__open_workspace()}
                      </Button>
                    ) : null}
                  </div>
                ) : (
                <>
                <AttachedChips attached={attached} onRemove={detach} />
                <form
                  className="relative flex items-end gap-2 border-t border-border bg-card px-5 py-3.5"
                  aria-label={m.shell_layout__message_pikku()}
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (!draft.trim() || extras.busy) return
                    {
                      const text = attached.length ? `${draft.trim()}\n\n${m.shell_layout__picked_in_preview({ items: attached.map((a) => a.label).join('; ') })}` : draft.trim()
                      say(asI18n(text + extras.suffix()))
                    }
                    setDraft('')
                    setAttached([])
                    extras.clear()
                  }}
                >
                  <textarea
                    ref={composerRef}
                    rows={1}
                    value={draft}
                    onChange={(e) => {
                      setDraft(e.target.value)
                      setSlashAt(0)
                      setSlashOff(false)
                    }}
                    role="combobox"
                    aria-expanded={slash.length > 0}
                    aria-controls="slash-menu"
                    aria-autocomplete="list"
                    aria-activedescendant={slash.length ? slashOptionId(slash[slashIdx].name) : undefined}
                    onKeyDown={(e) => {
                      if (slash.length && !e.nativeEvent.isComposing) {
                        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                          e.preventDefault()
                          setSlashAt((slashIdx + (e.key === 'ArrowDown' ? 1 : slash.length - 1)) % slash.length)
                          return
                        }
                        if (e.key === 'Escape') {
                          e.preventDefault()
                          setSlashOff(true)
                          return
                        }
                        if ((e.key === 'Enter' && !e.shiftKey) || e.key === 'Tab') {
                          e.preventDefault()
                          setDraft(`/${slash[slashIdx].name} `)
                          return
                        }
                      }
                      if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return
                      e.preventDefault()
                      e.currentTarget.form?.requestSubmit()
                    }}
                    aria-label={m.shell_layout__message_pikku()}
                    placeholder={attached.length ? m.shell_layout__say_what_to_change() : m.shell_layout__ask_or_tell()}
                    className="max-h-35 min-h-11 flex-1 resize-none rounded-xl border border-input bg-background px-3.5 py-2.5 text-[15px] leading-[1.4] text-foreground placeholder:text-muted-foreground hover:border-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                  <SlashMenu items={slash} active={slashIdx} onHover={setSlashAt} onPick={(c) => setDraft(`/${c.name} `)} />
                  <button
                    type="submit"
                    aria-label={m.parts__send()}
                    disabled={!draft.trim()}
                    className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground transition-colors duration-140 hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
                  >
                    <ArrowRight className="rtl:-scale-x-100 size-5" />
                  </button>
                </form>
                <ComposerTools projectKey={projectKey} extras={extras} field={composerRef} onText={dictate} />
                </>
                )}
                </>
                )}
              </div>
            ) : null}

            {panel === 'account' ? (
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 pt-5 pb-7">
                <section className="flex flex-col gap-3.5">
                  <h3 className="text-[18px] font-bold tracking-[-0.012em] text-balance">{m.shell_layout__settings()}</h3>
                  {([
                    [User, m.shell_layout__your_name_and_photo(), <AccountName key="name" />],
                    [Globe, m.shell_layout__language(), languageName(getLocale())],
                    [Bell, m.shell_layout__tell_me_when(), m.shell_layout__tell_me_when_text()],
                    [Palette, m.shell_layout__looks(), m.shell_layout__match_this_computer()],
                  ] satisfies [LucideIcon, I18nString, I18nNode][]).map(([Icon, title, text]) => (
                    <button key={title} type="button" className="flex items-start gap-3.5 rounded-lg text-start transition-colors duration-140 hover:bg-secondary">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-ink-2">
                        <Icon className="size-5" />
                      </span>
                      <div>
                        <b className="block text-[16px]">{title}</b>
                        <p className="text-[15px] text-ink-2 text-pretty">{text}</p>
                      </div>
                    </button>
                  ))}
                </section>
                <SignOutSection />
              </div>
            ) : null}

            {panel === 'pitch' ? <CloudPanel avatar={<Avatar mood="calm" size="md" />} onClose={() => setPanel('')} /> : null}

            {panel === 'workspace' ? (
              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-6 pt-5 pb-7">
                <div className="grid grid-cols-[auto_1fr] items-start gap-3 rounded-[18px] bg-secondary p-4">
                  <Avatar mood="calm" size="md" />
                  <p className="font-heading text-[17px] leading-[1.4] text-pretty">{m.shell_layout__where_work_lives()}</p>
                </div>
                <About
                  pikku={
                    <div className="flex items-start gap-3.5">
                      <span className="grid size-10 shrink-0 place-items-center">
                        <Avatar mood="calm" size="xs" ring={false} />
                      </span>
                      <div>
                        <b className="block text-[16px]">{m.parts__pikku()}</b>
                        <p className="text-[15px] text-ink-2 text-pretty">{m.shell_layout__pikku_scope()}</p>
                      </div>
                    </div>
                  }
                />
              </div>
            ) : null}
          </aside>

          {/* Pikku button and speech bubble */}
          <div className="absolute end-6 bottom-6 z-4 flex flex-col items-end gap-4 group-data-open/shell:hidden [:root:has([data-side-panel])_&]:hidden transition-all duration-420 ease-[cubic-bezier(.16,1,.3,1)] group-data-open/shell:end-114 @min-[1700px]/app:group-data-open/shell:end-126">
            {bubbleIsOpen ? (
              <section className="relative flex w-85 flex-col gap-3 rounded-card border border-border bg-card p-4 shadow-[0_6px_20px_-4px_rgba(8,40,52,0.16),0_2px_4px_rgba(8,40,52,0.06)]" aria-label={m.parts__pikku()} aria-live="polite">
                <span className="absolute -bottom-1.5 end-7 size-3 rotate-45 border-e border-b border-border bg-card" />
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-muted-foreground">{m.parts__pikku()}</span>
                  <button
                    type="button"
                    aria-label={m.shell_layout__dismiss()}
                    onClick={() => {
                      setDismissed(bubbleKey)
                      setBubbleOpen(false)
                    }}
                    className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <p className="font-heading text-[17px] leading-[1.32] font-medium text-foreground text-pretty">
                  {pending.length ? (
                    <>
                      {m.shell_layout__waiting({ count: pending.length })}
                      {sep(' ')}
                      <b>{pending[0].title}</b>
                    </>
                  ) : (
                    <>
                      {m.shell_layout__bubble_nothing()}
                      {sep(' ')}
                      <b>{m.shell_layout__bubble_tell_me()}</b>
                      {sep(' ')}
                      {m.shell_layout__bubble_ask_first()}
                    </>
                  )}
                </p>
                <div className="flex flex-wrap gap-2">
                  {bubbleActions.map(({ label, yes, run }) => (
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
                  onClick={() => setPanel('chat')}
                  className="inline-flex items-center gap-2 self-start rounded-sm py-1 text-[14px] font-bold text-accent-foreground hover:underline"
                >
                  <MessageCircle className="size-4.5" />
                  {m.parts__talk_to_pikku()}
                </button>
              </section>
            ) : null}
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label={m.shell_layout__your_helper()}
                aria-expanded={bubbleIsOpen}
                onClick={() => (fill ? setPanel(panel === 'chat' ? '' : 'chat') : setBubbleOpen(!bubbleIsOpen))}
                onPointerEnter={() => setHelperHot(true)}
                onPointerLeave={() => setHelperHot(false)}
                onFocus={() => setHelperHot(true)}
                onBlur={() => setHelperHot(false)}
                className="group relative grid size-17 place-items-center rounded-full cursor-pointer text-foreground transition-[transform,color] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:-translate-y-1 hover:scale-125 hover:text-primary focus-visible:text-primary focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
              >
                <Blob pose={helperHot ? 'ask' : POSE[mood]} className="size-20" />
                {needsCount > 0 && !bubbleIsOpen ? <span className="absolute -top-1 -end-1 grid h-6 min-w-6 place-items-center rounded-full bg-warning px-1.5 text-[13px] font-bold text-on-warning ring-2 ring-card">{needsCount}</span> : null}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ShellCtx.Provider>
  )
}
