import type { Kysely, Selectable, SelectQueryBuilder } from 'kysely'
import type { DB, InboxMessageTable } from '../db.js'
import type {
  InboxChannel,
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

const inStage = <O>(query: SelectQueryBuilder<DB, 'inboxMessage', O>, stage: string | null | undefined) =>
  stage === undefined ? query : stage === null ? query.where('stage', 'is', null) : query.where('stage', '=', stage)

const meta = (value: unknown): Record<string, unknown> | null => {
  if (value === null || value === undefined) return null
  const parsed = typeof value === 'string' ? JSON.parse(value) : value
  return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
}

type Row = Selectable<InboxMessageTable>

const summary = (row: Row): InboxSummary => ({
  id: row.messageId,
  projectKey: row.projectKey,
  stage: row.stage,
  channel: row.channel as InboxChannel,
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
      .insertInto('inboxMessage')
      .values({
        messageId: message.id,
        projectKey: message.projectKey,
        stage: message.stage,
        channel: message.channel,
        fromAddress: message.from,
        toAddresses: JSON.stringify(message.to),
        ccAddresses: JSON.stringify(message.cc),
        bccAddresses: JSON.stringify(message.bcc),
        subject: message.subject,
        html: message.html,
        body: message.body,
        templateName: message.templateName,
        templateLocale: message.templateLocale,
        status: message.status,
        deployRef: message.deployRef,
        meta: message.meta === null ? null : JSON.stringify(message.meta),
        createdAt: message.createdAt,
      })
      .execute()
    await this.prune(new Date(now.getTime() - RETENTION_DAYS * 24 * 60 * 60 * 1000))
  }

  async list({ projectKey, stage, channel, limit }: InboxListQuery): Promise<InboxSummary[]> {
    const base = this.kysely.selectFrom('inboxMessage').selectAll().where('projectKey', '=', projectKey)
    const rows = await inStage(channel ? base.where('channel', '=', channel) : base, stage)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .execute()
    return rows.map(summary)
  }

  async get({ projectKey, stage, id }: InboxGetQuery): Promise<InboxMessage | null> {
    const row = await inStage(
      this.kysely
        .selectFrom('inboxMessage')
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
      body: row.body,
      meta: meta(row.meta),
    }
  }

  async prune(olderThan: Date): Promise<number> {
    const result = await this.kysely.deleteFrom('inboxMessage').where('createdAt', '<', olderThan).executeTakeFirst()
    return Number(result.numDeletedRows ?? 0)
  }
}
