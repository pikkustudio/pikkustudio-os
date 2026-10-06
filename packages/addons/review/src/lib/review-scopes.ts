import { hasScopes } from '@pikku/core/scope'
import type { ReviewSubject } from './types.js'

export const REVIEW_SUBJECTS: readonly ReviewSubject[] = ['code', 'knowledge', 'ui']

export const REVIEW_SCOPES: readonly string[] = [
  'review:platform:code',
  'review:platform:knowledge',
  'review:platform:ui',
  'review:project:code',
  'review:project:knowledge',
  'review:project:ui',
]

/**
 * A platform verdict is evidence for every project; a project verdict stays
 * with the one that produced it. Which of the two a reviewer is casting is
 * decided by whether they named a project, not by a field they can set.
 */
export const scopeFor = (projectId: string | null, subject: ReviewSubject): string =>
  `review:${projectId ? 'project' : 'platform'}:${subject}`

export const heldReviewScopes = (held: readonly string[] | undefined): string[] =>
  REVIEW_SCOPES.filter((scope) => hasScopes([scope], held))

export const readableScopes = (
  held: readonly string[] | undefined,
  subject: ReviewSubject,
): string[] => heldReviewScopes(held).filter((scope) => scope.endsWith(`:${subject}`))
