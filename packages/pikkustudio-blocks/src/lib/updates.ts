import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useProjectQuery } from './projectRpc'
import { useSlots } from './slots'
import { auditProblem, type AuditProblem } from './audit'
import { changeEvent, mergeFeed, projectEvent, studioEvent, vaultEvent, type FeedItem, type RawAudit, type RawChange, type RawPerson, type RawStudio, type RawVault } from './updates-feed'

type AuditPage = { events: RawAudit[]; users: Record<string, RawPerson>; readable: boolean }
type VaultPage = { events: RawVault[] }
type StudioPage = { events: RawStudio[] }
type Changes = { changes: RawChange[] }

export type UpdatesNote = AuditProblem | 'unreadable' | null

const EVERY = 15_000

const noStageAudit = () => ({ data: undefined })

export function useUpdatesFeed(projectKey: string) {
  const audit = useProjectQuery<AuditPage>(projectKey, 'admin:getAudits', { limit: 30 }, { refetchInterval: EVERY })
  const changes = useProjectQuery<Changes>(projectKey, 'console:listStudioChanges', {}, { refetchInterval: EVERY })
  const vault = usePikkuQuery('vaultActivity', { limit: 30 }, { refetchInterval: EVERY } as never) as unknown as {
    data?: VaultPage
    isPending: boolean
    dataUpdatedAt: number
  }

  const useStage = useSlots().useStageAudit ?? noStageAudit
  const stage = useStage(projectKey, EVERY)
  const studio = usePikkuQuery('studioActivity', { limit: 30, ...(projectKey ? { key: projectKey } : {}) }, { refetchInterval: EVERY } as never) as unknown as {
    data?: StudioPage
    isPending: boolean
    dataUpdatedAt: number
  }

  const fromStage = stage.data?.readable ? stage.data.events.map((e) => projectEvent(e, stage.data?.users)) : []
  const fromStudio = (studio.data?.events ?? []).map(studioEvent)
  const fromAudit = audit.data?.readable ? audit.data.events.map((e) => projectEvent(e, audit.data?.users)) : []
  const fromChanges = (changes.data?.changes ?? []).flatMap((c) => changeEvent(c) ?? [])
  const mine = (who: string) => who === 'admin' || (!!projectKey && who === `project:${projectKey}`)
  const fromVault = (vault.data?.events ?? []).filter((e) => mine(e.who)).map(vaultEvent)
  const items: FeedItem[] = mergeFeed(fromAudit, fromStage, fromChanges, fromVault, fromStudio)

  const problem = audit.isError ? auditProblem(audit.error) : null
  const note: UpdatesNote = !projectKey ? null : problem && problem !== 'other' ? problem : audit.data && !audit.data.readable && !stage.data?.readable ? 'unreadable' : null
  const failure = problem === 'other' ? audit : null
  const loading = (!!projectKey && (audit.isPending || changes.isPending)) || vault.isPending || studio.isPending

  return { items, note, failure, loading, now: Math.max(audit.dataUpdatedAt, changes.dataUpdatedAt, vault.dataUpdatedAt, studio.dataUpdatedAt, Date.now()) }
}
