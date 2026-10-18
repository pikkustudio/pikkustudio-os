import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import type { UseQueryResult } from '@tanstack/react-query'
import { useProjectKey } from './project'
import { useProjectTarget } from './project-target'

export type InboxStatus = 'captured' | 'sent' | 'rejected'

export type InboxSummary = {
  id: string
  projectKey: string
  stage: string | null
  from: string | null
  to: string[]
  subject: string
  templateName: string | null
  templateLocale: string | null
  status: InboxStatus
  deployRef: string | null
  createdAt: string | Date
}

export type InboxHighlights = {
  primary: { kind: 'link'; value: string; label: string } | { kind: 'code'; value: string } | null
  links: { url: string; label: string }[]
  codes: string[]
}

export type InboxEmail = InboxSummary & { cc: string[]; bcc: string[]; html: string; text: string; highlights: InboxHighlights }

export type InboxList = { messages: InboxSummary[]; retentionDays: number }

export const inboxProjectKey = (key: string) => key.replace(/^cloud:/, '').replace(/@.*$/, '')

export const useInboxScope = () => {
  const key = useProjectKey()
  const target = useProjectTarget()
  return { projectKey: key ? inboxProjectKey(key) : '', stage: target.kind === 'stage' ? target.name : null }
}

const POLL_MS = 4000

export const useInboxList = (): UseQueryResult<InboxList> => {
  const { projectKey, stage } = useInboxScope()
  return usePikkuQuery('email:listInbox' as never, { projectKey, stage, limit: 100 } as never, { enabled: !!projectKey, refetchInterval: POLL_MS, retry: false } as never) as unknown as UseQueryResult<InboxList>
}

export const useInboxEmail = (id: string): UseQueryResult<InboxEmail> => {
  const { projectKey, stage } = useInboxScope()
  return usePikkuQuery('email:getInboxEmail' as never, { projectKey, stage, id } as never, { enabled: !!projectKey && !!id, retry: false } as never) as unknown as UseQueryResult<InboxEmail>
}
