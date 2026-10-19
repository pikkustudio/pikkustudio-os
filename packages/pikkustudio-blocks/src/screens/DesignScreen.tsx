import { asI18n, type I18nString } from '@pikku/react'
import { useCallback, useContext, useState } from 'react'
import { useNavigate, useParams, useSearch } from '@tanstack/react-router'
import { AppWindow, LayoutTemplate, Shapes, UserRound } from 'lucide-react'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { m } from '@/i18n/messages'
import { PreviewBar } from '../blocks/PreviewBar'
import { DesignInspector } from '../blocks/DesignInspector'
import { AppNotRunning } from '../blocks/AppNotRunning'
import { EmptyState } from '../blocks/EmptyState'
import { PikkuDot } from '../blocks/PikkuDot'
import { Button } from '../ui/button'
import { HintRow } from '../blocks/HintRow'
import { ImpersonatePanel } from '../blocks/ImpersonatePanel'
import { LiveAppFrame, liveAppUrl, type PickedElement } from '../blocks/LiveAppFrame'
import { LiveLookPanel } from '../blocks/LiveLookPanel'
import { LiveWordingPanel } from '../blocks/LiveWordingPanel'
import { ChatSelectPanel } from '../blocks/ChatSelectPanel'
import { ShellCtx, type AttachRef } from '../lib/shell'
import { DesignPartsFrame, type PartsCatalog, type PartsLens } from '../blocks/DesignPartsFrame'
import { StatusLine } from '../blocks/StatusLine'
import { MockStatusBar } from '../blocks/MockStatusBar'
import { useProjectKey } from '../lib/project'
import { keepSearch } from '../lib/project-url'
import type { Device, Mode, Styles } from '../types/designTypes'

type LiveApp = { slug: string; url: string | null; state: 'starting' | 'ready' | 'failed' }
type DesignPreview = { state: 'starting' | 'ready' | 'restarting' | 'failed' | 'stopped'; url: string; restarts: number; logTail: string } | null

const label = (slug: string): I18nString => {
  const text = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/[-_]+/g, ' ')
  return asI18n(text)
}

const pickedRef = ({ omId, omIndex, component, text: shown }: PickedElement): AttachRef => {
  const [file, line] = omId.split(':')
  const where = `${file}${line ? `:${line}` : ''}`
  const base = `${file.split('/').pop()}${line ? `:${line}` : ''}`
  const text = shown || component
  const meta = `${component} · ${base}`
  return { omId, omIndex, text: asI18n(text), meta: asI18n(meta), where: asI18n(where) }
}

const pickedLabel = ({ omId, component, text: shown }: PickedElement): I18nString => {
  const [file, line] = omId.split(':')
  const text = `${shown ? `“${shown}” ` : ''}${component} · ${file}${line ? `:${line}` : ''}`
  return asI18n(text)
}

export function DesignScreen() {
  const q = useSearch({ strict: false }) as { mode?: Mode; screen?: 'tablet' | 'phone'; app?: string }
  const route = useParams({ strict: false }) as { lens?: string; part?: string }
  const navigate = useNavigate()
  const set = (patch: Record<string, unknown>) => navigate({ to: '.', search: ((prev: object) => ({ ...prev, ...patch })) as never, replace: true })
  const key = useProjectKey()
  const { attached, attach, say } = useContext(ShellCtx)
  const [reloadKey, setReloadKey] = useState(0)
  const [picked, setPicked] = useState<PickedElement | null>(null)
  const [styles, setStyles] = useState<Styles>({})
  const [wordingKey, setWordingKey] = useState<string | null>(null)
  const forget = () => {
    setPicked(null)
    setStyles({})
    setWordingKey(null)
  }
  const apps = usePikkuQuery('studio:projectApps', { key }, {
    enabled: !!key,
    refetchInterval: (query: { state: { data?: LiveApp[] } }) => ((query.state.data ?? []).every((a) => a.state === 'ready') && (query.state.data ?? []).length > 0 ? 15000 : 2000),
  } as never)

  const list = ((apps.data as LiveApp[] | undefined) ?? [])
  const current = list.find((a) => a.slug === q.app) ?? list[0]
  const parts: PartsLens | null = route.lens === 'library' || route.lens === 'app' ? route.lens : null
  const [catalog, setCatalog] = useState<PartsCatalog>({ library: [], app: [] })
  const onCatalog = useCallback((next: PartsCatalog) => setCatalog(next), [])
  const preview = usePikkuQuery('studio:getDesignPreview', { key }, {
    enabled: !!key && !!parts,
    refetchInterval: (query: { state: { data?: DesignPreview } }) => (query.state.data?.state === 'ready' ? 15000 : 2000),
  } as never)
  const restartPreview = usePikkuMutation('studio:restartDesignPreview', { onSuccess: () => preview.refetch() })
  const startPreview = usePikkuMutation('studio:openProject', { onSuccess: () => preview.refetch() })
  const entries = parts ? catalog[parts] : []
  const section = parts ? (route.part && entries.some((e) => e.key === route.part) ? route.part : (entries[0]?.key ?? null)) : null
  const partGroups = parts
    ? [...new Set(entries.map((e) => e.group))].map((group) => ({ app: group, label: asI18n(group), pages: entries.filter((e) => e.group === group).map((e) => ({ id: e.key, name: asI18n(e.title), text: asI18n(group) })) }))
    : []
  const design = preview.data as DesignPreview | undefined

  const device: Device = q.screen ?? 'computer'
  const tool = q.mode === 'translations' || q.mode === 'chat' || q.mode === 'impersonate' || q.mode === 'none' ? q.mode : q.mode ? 'design' : 'none'

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
  } else if (apps.isSuccess && list.length === 0) {
    stage = (
      <EmptyState icon={AppWindow} title={m.design_live__no_app()} text={m.design_live__no_app_text()}>
        <Button type="button" size="page" onClick={() => say(m.design_live__no_app_say())}>
          <PikkuDot />
          {m.design_live__no_app_ask()}
        </Button>
      </EmptyState>
    )
  } else if (!key || !current?.url || current.state !== 'ready') {
    stage = <PartsWaiting text={m.design_live__loading()} />
  } else {
    stage = (
      <LiveAppFrame
        url={current.url}
        device={device}
        reloadKey={reloadKey}
        title={label(current.slug)}
        inspect={tool === 'chat' || tool === 'design' ? 'design' : tool === 'translations' ? 'i18n' : 'off'}
        marks={tool === 'chat' ? attached.filter((a) => a.omId).map((a) => ({ id: a.label, omId: a.omId, omIndex: a.omIndex, color: a.color })) : undefined}
        styles={tool === 'design' && picked && Object.keys(styles).length ? [{ omId: picked.omId, styles }] : []}
        onPick={(next) => {
          if (tool === 'chat') attach(pickedLabel(next), pickedRef(next))
          if (tool !== 'design') return
          setPicked(next)
          setStyles({})
        }}
        onWording={tool === 'translations' ? setWordingKey : undefined}
      />
    )
  }

  function start_parts() {
    startPreview.mutate({ key })
  }

  const panel = {
    design: m.design_live__look_title(),
    translations: m.design_live__words_title(),
    chat: m.design_live__chat_title(),
    impersonate: m.impersonate__title(),
  } as const
  const title = panel[tool === 'none' ? 'design' : tool]

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
          onPick={(_a, p) => {
            forget()
            if (parts) navigate({ to: `/design/parts/${parts}/${encodeURIComponent(p)}` as never, search: keepSearch as never, replace: true })
            else set({ app: p })
          }}
          onDevice={(d) => set({ screen: d === 'computer' ? undefined : d })}
          onTool={(t) => {
            forget()
            set({ mode: t === 'design' ? 'theme' : t })
          }}
          onReload={() => setReloadKey((k) => k + 1)}
          onOpenTab={parts ? (design?.url ? () => window.open(liveAppUrl(design.url), '_blank', 'noopener') : undefined) : current?.url ? () => window.open(liveAppUrl(current.url!), '_blank', 'noopener') : undefined}
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
              ) : tool === 'chat' ? (
                <ChatSelectPanel attached={attached} />
              ) : tool === 'translations' ? (
                <LiveWordingPanel key={wordingKey ?? ''} wordingKey={wordingKey} reloadKey={reloadKey} />
              ) : (
                <LiveLookPanel key={picked?.omId ?? ''} picked={picked} styles={styles} onStyles={setStyles} onRetry={() => { forget(); setReloadKey((k) => k + 1) }} />
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
