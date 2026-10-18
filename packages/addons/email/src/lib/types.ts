export type InboxStatus = 'captured' | 'sent' | 'rejected'

export const RETENTION_DAYS = 7

export interface InboxMessage {
  id: string
  projectKey: string
  stage: string | null
  from: string | null
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  html: string
  text: string
  templateName: string | null
  templateLocale: string | null
  status: InboxStatus
  deployRef: string | null
  createdAt: Date
}

export type InboxSummary = Omit<InboxMessage, 'html' | 'text' | 'cc' | 'bcc'>

export interface InboxListQuery {
  projectKey: string
  stage?: string | null
  limit: number
}

export interface InboxGetQuery {
  projectKey: string
  stage?: string | null
  id: string
}

export interface InboxStore {
  add(message: InboxMessage, now?: Date): Promise<void>
  list(query: InboxListQuery): Promise<InboxSummary[]>
  get(query: InboxGetQuery): Promise<InboxMessage | null>
  prune(olderThan: Date): Promise<number>
}

export interface InboxAccess {
  canView(session: { userId?: string } | undefined, projectKey: string): Promise<boolean>
}

export interface CapturedEmail {
  from: string | null
  to: string[]
  cc: string[]
  bcc: string[]
  subject: string
  html: string
  text: string
  templateName: string | null
  templateLocale: string | null
  deployRef: string | null
}

export interface InboxHighlights {
  primary: { kind: 'link'; value: string; label: string } | { kind: 'code'; value: string } | null
  links: { url: string; label: string }[]
  codes: string[]
}
