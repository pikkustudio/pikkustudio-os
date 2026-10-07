import { useState } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Segmented } from '../blocks/Segmented'
import { StatusLine } from '../blocks/StatusLine'
import { homeStates, projectHomes, type HomeState } from '../mocks/projectHome'
import type { Way } from '../lib/projectHome'
import { ProjectLandingScreen } from './ProjectLandingScreen'

const said: Record<Way, string> = {
  local: 'Would open the project on this computer.',
  cloud: 'Would open, wake or join the cloud workspace.',
  look: 'Would show what is online, without opening a workspace.',
}

export function ProjectLandingMockScreen() {
  const { state } = useSearch({ strict: false }) as { state?: HomeState }
  const navigate = useNavigate()
  const [act, setAct] = useState<Way | null>(null)
  const current = homeStates.some(([id]) => id === state) ? (state as HomeState) : 'new'
  return (
    <div className="mx-auto flex max-w-[1160px] flex-col gap-6 @min-[1700px]/app:max-w-[1380px]">
      <div className="flex flex-wrap items-center gap-3 rounded-card border border-dashed border-input px-4 py-3">
        <span className="text-[14px] font-bold text-ink-2">Preview the page when</span>
        <Segmented label="State" value={current} options={homeStates.map(([id, text]) => [id, text])} onChange={(v) => { setAct(null); navigate({ to: '.', search: ((p: object) => ({ ...p, state: v })) as never }) }} />
        {act ? <StatusLine tone="ok" text={said[act]} /> : null}
      </div>
      <ProjectLandingScreen home={projectHomes[current]} onAct={setAct} />
    </div>
  )
}
