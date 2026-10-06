import type { ExpressionBuilder, Kysely } from 'kysely'
import type { DB } from '../db.js'
import type {
  ReviewSubject,
  ReviewTarget,
  ReviewVerdict,
  TargetKind,
  VerdictQuery,
  VerdictStore,
} from '../lib/types.js'

const matchesTarget = (target: ReviewTarget) => (eb: ExpressionBuilder<DB, 'reviewVerdict'>) =>
  eb.and([
    target.projectId === null
      ? eb('projectId', 'is', null)
      : eb('projectId', '=', target.projectId),
    eb('targetKind', '=', target.targetKind),
    eb('targetId', '=', target.targetId),
    target.implementationHash === null
      ? eb('implementationHash', 'is', null)
      : eb('implementationHash', '=', target.implementationHash),
  ])

/**
 * Scope filtering is enumeration, not a post-read filter: a caller holding only
 * `review:project:code` never receives a platform verdict to discard.
 */
export class KyselyVerdictStore implements VerdictStore {
  constructor(private readonly kysely: Kysely<DB>) {}

  async list({ subject, scopes, projectId, kind }: VerdictQuery): Promise<ReviewVerdict[]> {
    if (scopes.length === 0) {
      return []
    }
    let query = this.kysely
      .selectFrom('reviewVerdict')
      .selectAll()
      .where('subject', '=', subject)
      .where('castUnderScope', 'in', scopes)

    if (projectId !== undefined) {
      query =
        projectId === null
          ? query.where('projectId', 'is', null)
          : query.where('projectId', '=', projectId)
    }
    if (kind !== undefined) {
      query = query.where('kind', '=', kind)
    }

    const rows = await query.orderBy('castAt', 'desc').execute()

    return rows.map((row) => ({
      projectId: row.projectId,
      targetKind: row.targetKind as TargetKind,
      targetId: row.targetId,
      contractHash: row.contractHash,
      implementationHash: row.implementationHash,
      subject: row.subject as ReviewSubject,
      kind: row.kind as ReviewVerdict['kind'],
      reasons: typeof row.reasons === 'string' ? JSON.parse(row.reasons) : row.reasons,
      note: row.note,
      castUnderScope: row.castUnderScope,
      organizationId: row.organizationId,
      castByUserId: row.castByUserId,
      castAt: new Date(row.castAt as unknown as string),
    }))
  }

  async cast(verdict: ReviewVerdict): Promise<void> {
    await this.kysely.transaction().execute(async (trx) => {
      await trx
        .deleteFrom('reviewVerdict')
        .where('castUnderScope', '=', verdict.castUnderScope)
        .where(matchesTarget(verdict))
        .execute()

      await trx
        .insertInto('reviewVerdict')
        .values({
          verdictId: crypto.randomUUID(),
          projectId: verdict.projectId,
          targetKind: verdict.targetKind,
          targetId: verdict.targetId,
          contractHash: verdict.contractHash,
          implementationHash: verdict.implementationHash,
          subject: verdict.subject,
          kind: verdict.kind,
          reasons: verdict.reasons,
          note: verdict.note,
          castUnderScope: verdict.castUnderScope,
          organizationId: verdict.organizationId,
          castByUserId: verdict.castByUserId,
          castAt: verdict.castAt,
        })
        .execute()
    })
  }

  async clear(target: ReviewTarget, scopes: string[]): Promise<void> {
    if (scopes.length === 0) {
      return
    }
    await this.kysely
      .deleteFrom('reviewVerdict')
      .where('castUnderScope', 'in', scopes)
      .where(matchesTarget(target))
      .execute()
  }
}
