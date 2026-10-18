import type { Kysely, Selectable, SelectQueryBuilder } from 'kysely'
import type { DB, EmailMessageTable } from '../db.js'
import type {
  InboxGetQuery,
  InboxListQuery,
  InboxMessage,
  InboxStatus,
  InboxStore,
  InboxSummary,
} from '../lib/types.js'
import { RETENTION_DAYS } from '../lib/types.js'

const addresses = (value: unknown): string[] => {
  const parsed = typeof value === 'string' ? JSON.parse(value) : value
  return Array.isArray(parsed) ? parsed.map(String) : []
}

const inStage = <O>(query: SelectQueryBuilder<DB, 'emailMessage', O>, stage: string | null | undefined) =>
  stage === undefined ? query : stage === null ? query.where('stage', 'is', null) : query.where('stage', '=', stage)

type Row = Selectable<EmailMessageTable>

const summary = (row: Row): InboxSummary => ({
  id: row.messageId,
  projectKey: row.projectKey,
  stage: row.stage,
  from: row.fromAddress,
  to: addresses(row.toAddresses),
  subject: row.subject,
  templateName: row.templateName,
  templateLocale: row.templateLocale,
  status: row.status as InboxStatus,
  deployRef: row.deployRef,
  createdAt: new Date(row.createdAt as unknown as string),
})

export class KyselyInboxStore implements InboxStore {
  constructor(private readonly kysely: Kysely<DB>) {}

  async add(message: InboxMessage, now = new Date()): Promise<void> {
    await this.kysely
      .insertInto('emailMessage')
      .values({
        messageId: message.id,
        projectKey: message.projectKey,
        stage: message.stage,
        fromAddress: message.from,
        toAddresses: JSON.stringify(message.to),
        ccAddresses: JSON.stringify(message.cc),
        bccAddresses: JSON.stringify(message.bcc),
        subject: message.subject,
        html: message.html,
        text: message.text,
        templateName: message.templateName,
        templateLocale: message.templateLocale,
        status: message.status,
        deployRef: message.deployRef,
        createdAt: message.createdAt,
      })
      .execute()
    await this.prune(new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000))
  }

  async list({ projectKey, stage, limit }: InboxListQuery): Promise<InboxSummary[]> {
    const rows = await inStage(
      this.kysely.selectFrom('emailMessage').selectAll().where('projectKey', '=', projectKey),
      stage
    )
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .execute()
    return rows.map(summary)
  }

  async get({ projectKey, stage, id }: InboxGetQuery): Promise<InboxMessage | null> {
    const row = await inStage(
      this.kysely
        .selectFrom('emailMessage')
        .selectAll()
        .where('projectKey', '=', projectKey)
        .where('messageId', '=', id),
      stage
    ).executeTakeFirst()
    if (!row) return null
    return {
      ...summary(row),
      cc: addresses(row.ccAddresses),
      bcc: addresses(row.bccAddresses),
      html: row.html,
      text: row.text,
    }
  }

  async prune(olderThan: Date): Promise<number> {
    const result = await this.kysely.deleteFrom('emailMessage').where('createdAt', '<', olderThan).executeTakeFirst()
    return Number(result.numDeletedRows ?? 0)
  }
}
