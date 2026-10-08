import { useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Globe, MousePointer2, Palette } from 'lucide-react'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { m } from '@/i18n/messages'
import { PinButton } from '../blocks/PinButton'
import { PreviewBar } from '../blocks/PreviewBar'
import { DesignInspector } from '../blocks/DesignInspector'
import { AppNotRunning } from '../blocks/AppNotRunning'
import { HintRow } from '../blocks/HintRow'
import { LiveAppFrame, liveAppUrl } from '../blocks/LiveAppFrame'
import { MockStatusBar } from '../blocks/MockStatusBar'
import { useProjectKey } from '../lib/project'
import type { Device, Mode } from '../types/designTypes'

type LiveApp = { slug: string; url: string | null; state: 'starting' | 'ready' | 'failed' }

const label = (slug: string) => slug.charAt(0).toUpperCase() + slug.slice(1).replace(/[-_]+/g, ' ')

export function DesignScreen() {
  const q = useSearch({ strict: false }) as { mode?: Mode; screen?: 'tablet' | 'phone'; app?: string }
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
  const device: Device = q.screen ?? 'computer'
  const tool = q.mode === 'translations' || q.mode === 'chat' || q.mode === 'none' ? q.mode : 'design'
  const failed = list.some((a) => a.state === 'failed') || start.isError

  const app = current ? label(current.slug) : undefined
  let stage
  if (!key || apps.isPending) {
    stage = <AppNotRunning state="starting" name={app} onStart={() => undefined} />
  } else if (failed) {
    stage = <AppNotRunning state="failed" name={app} onStart={() => restart.mutate({ key })} starting={restart.isPending || start.isPending} />
  } else if (list.length === 0) {
    stage = <AppNotRunning state="off" onStart={() => { setWanted(true); start.mutate({ key }) }} starting={wanted && start.isPending} />
  } else if (!current?.url || current.state !== 'ready') {
    stage = <AppNotRunning state="starting" name={app} onStart={() => undefined} />
  } else {
    stage = <LiveAppFrame url={current.url} device={device} reloadKey={reloadKey} title={label(current.slug)} />
  }

  const panel = {
    design: [m.design_live__look_title(), Palette, m.design_live__look_text()],
    translations: [m.design_live__words_title(), Globe, m.design_live__words_text()],
    chat: [m.design_live__chat_title(), MousePointer2, m.design_live__chat_text()],
  } as const
  const [title, Icon, text] = panel[tool === 'none' ? 'design' : tool]

  return (
    <div className="flex h-full flex-col gap-3">
      <MockStatusBar />
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <PreviewBar
          app="live"
          page={current?.slug ?? ''}
          groups={[{ app: 'live', label: m.design_live__apps(), pages: list.map((a) => ({ id: a.slug, name: label(a.slug), text: a.state === 'ready' ? m.design_live__running() : m.design_live__starting_short() })) }]}
          device={device}
          tool={tool}
          noun={m.design_live__app_noun()}
          onPick={(_a, p) => set({ app: p })}
          onDevice={(d) => set({ screen: d === 'computer' ? undefined : d })}
          onTool={(t) => set({ mode: t === 'design' ? undefined : t })}
          onReload={() => setReloadKey((k) => k + 1)}
          onOpenTab={current?.url ? () => window.open(liveAppUrl(current.url!), '_blank', 'noopener') : undefined}
          actions={<PinButton variant="bar" />}
        />
        <div className={`grid min-h-0 flex-1 gap-3.5 ${tool === 'none' ? 'grid-cols-1' : 'grid-cols-[minmax(0,1fr)_340px]'}`}>
          {stage}
          {tool !== 'none' && (
            <DesignInspector title={title} mode="theme" showModes={false} onMode={() => undefined} onClose={tool === 'design' ? undefined : () => set({ mode: 'none' })}>
              <HintRow icon={Icon}>{text}</HintRow>
            </DesignInspector>
          )}
        </div>
      </div>
    </div>
  )
}
