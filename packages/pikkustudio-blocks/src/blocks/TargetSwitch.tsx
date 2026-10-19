import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useNavigate } from '@tanstack/react-router'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { Segmented } from './Segmented'
import { useProjectKey } from '../lib/project'
import { LOCAL_WORKSPACE, formatTarget, useProjectTarget } from '../lib/project-target'

type Stage = { name: string; production: boolean; live: boolean }

/** Which copy Logs and Metrics read: shown only where this host can see a published one. */
export function TargetSwitch() {
  const key = useProjectKey()
  const target = useProjectTarget()
  const navigate = useNavigate()
  const targets = usePikkuQuery('studio:projectTargets', { key }, { enabled: !!key })
  const stages = ((targets.data as { stages?: Stage[] } | undefined)?.stages ?? []).filter((s) => s.live)
  const site = (stages.find((s) => s.production) ?? stages[0])?.name ?? null
  if (!site && target.kind !== 'stage') return null
  const here = target.kind === 'workspace' && target.name !== LOCAL_WORKSPACE ? m.metrics_live__your_copy() : m.metrics_live__your_computer()
  const there = target.kind === 'stage' && target.name !== site ? asI18n(target.name) : m.metrics_live__live_site()
  const pick = (v: string) => {
    if (v === target.kind) return
    if (v === 'workspace') target.openWorkspace?.()
    else if (site) void navigate({ to: '.', search: ((prev: object) => ({ ...prev, target: formatTarget({ kind: 'stage', name: site }) })) as never })
  }
  return <Segmented label={m.metrics_live__which()} value={target.kind} options={[['workspace', here], ['stage', there]]} onChange={pick} />
}
