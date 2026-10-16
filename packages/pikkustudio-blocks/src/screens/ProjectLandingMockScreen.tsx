import type { I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useState } from 'react'
import { usePikkuQueryStub } from '@project/functions-sdk/pikku/api.gen'
import { CardsSkeleton, QueryState } from '../blocks/QueryState'
import { StatusLine } from '../blocks/StatusLine'
import type { ProjectHome, Way } from '../lib/projectHome'
import { ProjectLandingScreen } from './ProjectLandingScreen'

const said = (): Record<Way, I18nString> => ({
  local: m.project_landing_mock__said_local(),
  cloud: m.project_landing_mock__said_cloud(),
  look: m.project_landing_mock__said_look(),
})

export function ProjectLandingMockScreen() {
  const query = usePikkuQueryStub('studio:projectHome', { featureFlag: 'projectLanding' })
  const [act, setAct] = useState<Way | null>(null)
  return (
    <div className="mx-auto flex max-w-[1160px] flex-col gap-6 @min-[1700px]/app:max-w-[1380px]">
      {act ? <StatusLine tone="ok" text={said()[act]} /> : null}
      <QueryState query={query as never} skeleton={<CardsSkeleton count={2} />}>
        {(home: ProjectHome) => <ProjectLandingScreen home={home} onAct={setAct} />}
      </QueryState>
    </div>
  )
}
