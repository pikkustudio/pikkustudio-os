import type { Kysely } from 'kysely'
import type { DB } from '../db.js'
import type {
  CommentQuery,
  CommentStore,
  ReviewComment,
  ReviewSubject,
  TargetKind,
} from '../lib/types.js'

export class KyselyCommentStore implements CommentStore {
  constructor(private readonly kysely: Kysely<DB>) {}

  async list({ subject, scopes, projectId, targetId }: CommentQuery): Promise<ReviewComment[]> {
    if (scopes.length === 0) {
      return []
    }
    let query = this.kysely
      .selectFrom('reviewComment')
      .selectAll()
      .where('subject', '=', subject)
      .where('castUnderScope', 'in', scopes)

    if (projectId !== undefined) {
      query =
        projectId === null
          ? query.where('projectId', 'is', null)
          : query.where('projectId', '=', projectId)
    }
    if (targetId !== undefined) {
      query = query.where('targetId', '=', targetId)
    }

    const rows = await query.orderBy('lineStart', 'asc').orderBy('castAt', 'asc').execute()

    return rows.map((row) => ({
      commentId: row.commentId,
      projectId: row.projectId,
      targetKind: row.targetKind as TargetKind,
      targetId: row.targetId,
      contractHash: row.contractHash,
      implementationHash: row.implementationHash,
      subject: row.subject as ReviewSubject,
      sourceFile: row.sourceFile,
      lineStart: row.lineStart,
      lineEnd: row.lineEnd,
      body: row.body,
      castUnderScope: row.castUnderScope,
      organizationId: row.organizationId,
      castByUserId: row.castByUserId,
      castAt: new Date(row.castAt as unknown as string),
    }))
  }

  async add(comment: ReviewComment): Promise<void> {
    await this.kysely
      .insertInto('reviewComment')
      .values({
        commentId: comment.commentId,
        projectId: comment.projectId,
        targetKind: comment.targetKind,
        targetId: comment.targetId,
        contractHash: comment.contractHash,
        implementationHash: comment.implementationHash,
        subject: comment.subject,
        sourceFile: comment.sourceFile,
        lineStart: comment.lineStart,
        lineEnd: comment.lineEnd,
        body: comment.body,
        castUnderScope: comment.castUnderScope,
        organizationId: comment.organizationId,
        castByUserId: comment.castByUserId,
        castAt: comment.castAt,
      })
      .execute()
  }

  async remove(commentId: string, scopes: string[]): Promise<boolean> {
    if (scopes.length === 0) {
      return false
    }
    const result = await this.kysely
      .deleteFrom('reviewComment')
      .where('commentId', '=', commentId)
      .where('castUnderScope', 'in', scopes)
      .executeTakeFirst()

    return Number(result.numDeletedRows ?? 0) > 0
  }
}
