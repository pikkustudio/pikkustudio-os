import type { ColumnType } from 'kysely'

export type Generated<T> =
  T extends ColumnType<infer S, infer I, infer U>
    ? ColumnType<S, I | undefined, U>
    : ColumnType<T, T | undefined, T>

export type Timestamp = ColumnType<Date, Date | string, Date | string>

export interface EmailMessageTable {
  messageId: string
  projectKey: string
  stage: string | null
  fromAddress: string | null
  toAddresses: string
  ccAddresses: string
  bccAddresses: string
  subject: string
  html: string
  text: string
  templateName: string | null
  templateLocale: string | null
  status: string
  deployRef: string | null
  createdAt: Generated<Timestamp>
}

export interface DB {
  emailMessage: EmailMessageTable
}
