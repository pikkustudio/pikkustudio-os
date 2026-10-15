import { asI18n, type I18nString } from '@pikku/react'
import { useCallback, useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Globe, MousePointer2, Palette, UserRound } from 'lucide-react'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { m } from '@/i18n/messages'
import { PinButton } from '../blocks/PinButton'
import { PreviewBar } from '../blocks/PreviewBar'
import { DesignInspector } from '../blocks/DesignInspector'
import { AppNotRunning, startSteps } from '../blocks/AppNotRunning'
import { HintRow } from '../blocks/HintRow'
import { ImpersonatePanel } from '../blocks/ImpersonatePanel'
import { LiveAppFrame, liveAppUrl } from '../blocks/LiveAppFrame'
import { DesignPartsFrame, type PartsCatalog, type PartsLens } from '../blocks/DesignPartsFrame'
import { StatusLine } from '../blocks/StatusLine'
import { MockStatusBar } from '../blocks/MockStatusBar'
import { useProjectKey } from '../lib/project'
import type { Device, Mode } from '../types/designTypes'

type LiveApp = { slug: string; url: string | null; state: 'starting' | 'ready' | 'failed' }
type DesignPreview = { state: 'starting' | 'ready' | 'restarting' | 'failed' | 'stopped'; url: string; restarts: number; logTail: string } | null

const label = (slug: string): I18nString => {
  const text = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/[-_]+/g, ' ')
  return asI18n(text)
}

export function DesignScreen() {
  const q = useSearch({ strict: false }) as { mode?: Mode; screen?: 'tablet' | 'phone'; app?: string; parts?: PartsLens; part?: string }
  const navigate = useNavigate()
  const set = (patch: Record<string, unknown>) => navigate({ to: '.', search: ((prev: object) => ({ ...prev, ...patch })) as never, replace: true })
  const key = useProjectKey()
  const [reloadKey, setReloadKey] = useState(0)
  const [wanted, setWanted] = useState(false)
  const apps = usePikkuQuery('studio:projectApps', { key }, {
    enabled: !!key,
    refetchInterval: (query: { state: { data?: LiveApp[] } }) => ((query.state.data ?? []).every((a) => a.state === 'ready') && (query.state.data ?? []).length > 0 ? 15000 : 2000),
  } as never)
  const start = usePikkuMutation('studio:openProject', { onSuccess: () => apps.refetch() })
  const restart = usePikkuMutation('studio:closeProject', { onSuccess: () => start.mutate({ key }) })

  const list = ((apps.data as LiveApp[] | undefined) ?? [])
  const current = list.find((a) => a.slug === q.app) ?? list[0]
  const parts = q.parts === 'library' || q.parts === 'app' ? q.parts : null
  const [catalog, setCatalog] = useState<PartsCatalog>({ library: [], app: [] })
  const onCatalog = useCallback((next: PartsCatalog) => setCatalog(next), [])
  const preview = usePikkuQuery('studio:getDesignPreview', { key }, {
    enabled: !!key && !!parts,
    refetchInterval: (query: { state: { data?: DesignPreview } }) => (query.state.data?.state === 'ready' ? 15000 : 2000),
  } as never)
  const restartPreview = usePikkuMutation('studio:restartDesignPreview', { onSuccess: () => preview.refetch() })
  const startPreview = usePikkuMutation('studio:openProject', { onSuccess: () => preview.refetch() })
  const entries = parts ? catalog[parts] : []
  const section = parts ? (q.part && entries.some((e) => e.key === q.part) ? q.part : (entries[0]?.key ?? null)) : null
  const partGroups = parts
    ? [...new Set(entries.map((e) => e.group))].map((group) => ({ app: group, label: asI18n(group), pages: entries.filter((e) => e.group === group).map((e) => ({ id: e.key, name: asI18n(e.title), text: asI18n(group) })) }))
    : []
  const design = preview.data as DesignPreview | undefined

  const device: Device = q.screen ?? 'computer'
  const tool = q.mode === 'translations' || q.mode === 'chat' || q.mode === 'impersonate' || q.mode === 'none' ? q.mode : 'design'
  const failed = list.some((a) => a.state === 'failed') || start.isError

  const app = current ? label(current.slug) : undefined
  let stage
  if (parts) {
    const url = design?.url
    if (!key || preview.isPending) {
      stage = <PartsWaiting text={m.design_parts__starting()} />
    } else if (design === null) {
      stage = <AppNotRunning state="off" name={m.design_parts__name()} what={m.design_parts__what_default()} onStart={() => start_parts()} starting={startPreview.isPending} />
    } else if (design?.state === 'failed' || design?.state === 'stopped' || (design?.state === 'ready' && !url)) {
      stage = <AppNotRunning state="failed" name={m.design_parts__name()} reason={design.state === 'stopped' ? m.design_parts__reason_stopped() : m.design_parts__reason_failed()} logText={design.logTail} fixSay={(log) => m.design_parts__fix_say({ log: asI18n(log) })} onStart={() => restartPreview.mutate({ key })} starting={restartPreview.isPending} />
    } else if (design?.state === 'ready' && url) {
      stage = <DesignPartsFrame url={url} lens={parts} section={section} reloadKey={reloadKey} onCatalog={onCatalog} />
    } else {
      stage = <PartsWaiting text={design?.state === 'restarting' ? m.design_parts__restarting() : m.design_parts__starting()} />
    }
  } else if (!key || apps.isPending) {
    stage = <AppNotRunning state="starting" name={app} steps={startSteps(start.isSuccess, list)} onStart={() => undefined} />
  } else if (failed) {
    stage = <AppNotRunning state="failed" name={app} error={start.error ?? restart.error} onStart={() => restart.mutate({ key })} starting={restart.isPending || start.isPending} />
  } else if (list.length === 0) {
    stage = <AppNotRunning state="off" onStart={() => { setWanted(true); start.mutate({ key }) }} starting={wanted && start.isPending} />
  } else if (!current?.url || current.state !== 'ready') {
    stage = <AppNotRunning state="starting" name={app} steps={startSteps(start.isSuccess, list)} onStart={() => undefined} />
  } else {
    stage = <LiveAppFrame url={current.url} device={device} reloadKey={reloadKey} title={label(current.slug)} />
  }

  function start_parts() {
    setWanted(true)
    startPreview.mutate({ key })
  }

  const panel = {
    design: [m.design_live__look_title(), Palette, m.design_live__look_text()],
    translations: [m.design_live__words_title(), Globe, m.design_live__words_text()],
    chat: [m.design_live__chat_title(), MousePointer2, m.design_live__chat_text()],
    impersonate: [m.impersonate__title(), UserRound, m.impersonate__text()],
  } as const
  const [title, Icon, text] = panel[tool === 'none' ? 'design' : tool]

  return (
    <div className="flex h-full flex-col gap-3">
      <MockStatusBar />
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <PreviewBar
          app="live"
          page={parts ? (section ?? '') : (current?.slug ?? '')}
          groups={parts ? partGroups : [{ app: 'live', label: m.design_live__apps(), pages: list.map((a) => ({ id: a.slug, name: label(a.slug), text: a.state === 'ready' ? m.design_live__running() : m.design_live__starting_short() })) }]}
          device={device}
          tool={tool}
          tools={parts ? [] : undefined}
          hideDevice={!!parts}
          kind={parts ? 'part' : 'app'}
          onPick={(_a, p) => set(parts ? { part: p } : { app: p })}
          onDevice={(d) => set({ screen: d === 'computer' ? undefined : d })}
          onTool={(t) => set({ mode: t === 'design' ? undefined : t })}
          onReload={() => setReloadKey((k) => k + 1)}
          onOpenTab={parts ? (design?.url ? () => window.open(liveAppUrl(design.url), '_blank', 'noopener') : undefined) : current?.url ? () => window.open(liveAppUrl(current.url!), '_blank', 'noopener') : undefined}
          actions={
            <>
              <PinButton variant="bar" />
            </>
          }
        />
        <div className={`grid min-h-0 flex-1 gap-3.5 ${tool === 'none' || parts ? 'grid-cols-1' : 'grid-cols-[minmax(0,1fr)_340px]'}`}>
          {stage}
          {tool !== 'none' && !parts && (
            <DesignInspector title={title} mode="theme" showModes={false} onMode={() => undefined} onClose={tool === 'design' ? undefined : () => set({ mode: 'none' })}>
              {tool === 'impersonate' ? (
                <>
                  <HintRow icon={UserRound}>{m.impersonate__text()}</HintRow>
                  {current?.url && current.state === 'ready' ? <ImpersonatePanel onSwitched={() => setReloadKey((k) => k + 1)} /> : null}
                </>
              ) : (
                <HintRow icon={Icon}>{text}</HintRow>
              )}
            </DesignInspector>
          )}
        </div>
      </div>
    </div>
  )
}

function PartsWaiting({ text }: { text: I18nString }) {
  return (
    <div className="flex min-h-[320px] items-center justify-center rounded-card bg-card">
      <StatusLine text={text} tone="wait" />
    </div>
  )
}
