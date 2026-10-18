import type { ColumnType } from 'kysely'

export type Generated<T> =
  T extends ColumnType<infer S, infer I, infer U>
    ? ColumnType<S, I | undefined, U>
    : ColumnType<T, T | undefined, T>

export type Timestamp = ColumnType<Date, Date | string, Date | string>

export interface InboxMessageTable {
  messageId: string
  projectKey: string
  stage: string | null
  channel: string
  fromAddress: string | null
  toAddresses: string
  ccAddresses: string
  bccAddresses: string
  subject: string | null
  html: string | null
  body: string
  templateName: string | null
  templateLocale: string | null
  status: string
  deployRef: string | null
  meta: string | null
  createdAt: Generated<Timestamp>
}

export interface DB {
  inboxMessage: InboxMessageTable
}
