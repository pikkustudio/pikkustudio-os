/**
 * Kysely types for the review addon's own tables, which live in the cloud's
 * Postgres database (db/postgres/0150, 0158, 0159). Hand-maintained — keep in sync
 * with those migrations.
 */

import type { ColumnType } from 'kysely'

export type Generated<T> =
  T extends ColumnType<infer S, infer I, infer U>
    ? ColumnType<S, I | undefined, U>
    : ColumnType<T, T | undefined, T>

export type Timestamp = ColumnType<Date, Date | string, Date | string>

export interface ReviewVerdictTable {
  verdictId: string
  projectId: string | null
  targetKind: string
  targetId: string
  contractHash: string | null
  implementationHash: string | null
  subject: string
  kind: string
  reasons: string[]
  note: string | null
  castUnderScope: string
  organizationId: string | null
  castByUserId: string | null
  castAt: Generated<Timestamp>
}

export interface ReviewCommentTable {
  commentId: string
  projectId: string | null
  targetKind: string
  targetId: string
  contractHash: string | null
  implementationHash: string | null
  subject: string
  sourceFile: string
  lineStart: number
  lineEnd: number
  body: string
  castUnderScope: string
  organizationId: string | null
  castByUserId: string | null
  castAt: Generated<Timestamp>
}

export interface DB {
  reviewVerdict: ReviewVerdictTable
  reviewComment: ReviewCommentTable
}
