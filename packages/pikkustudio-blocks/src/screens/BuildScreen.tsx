import { useNavigate, useSearch } from '@tanstack/react-router'
import { DesignWorkbench } from '../blocks/DesignWorkbench'
import { sample } from '../mocks/designSample'
import { useProjectThemes } from '../lib/themes'
import type { Device, Mode } from '../types/designTypes'


export function BuildScreen() {
  const q = useSearch({ strict: false }) as { mode?: Mode; screen?: 'tablet' | 'phone'; app?: 'staff'; pg?: string }
  const navigate = useNavigate()
  const set = (patch: Record<string, unknown>) => navigate({ to: '.', search: ((prev: object) => ({ ...prev, ...patch })) as never, replace: true })
  const { themes, current } = useProjectThemes()
  if (themes) {
    sample.themes = { ...themes, sunrise: themes[current] ?? Object.values(themes)[0]! }
  }
  const app = q.app === 'staff' ? 'staff' : 'pub'
  return (
    <DesignWorkbench
      key={themes ? current : 'sample'}
      mode={q.mode ?? 'theme'}
      device={q.screen ?? 'computer'}
      app={app}
      page={app === 'staff' ? 'staff' : (q.pg ?? 'home')}
      onMode={(m: Mode) => set({ mode: m === 'theme' ? undefined : m })}
      onDevice={(d: Device) => set({ screen: d === 'computer' ? undefined : d })}
      onOpen={(a: 'pub' | 'staff', p: string) => set({ app: a === 'staff' ? 'staff' : undefined, pg: a === 'staff' || p === 'home' ? undefined : p })}
    />
  )
}
