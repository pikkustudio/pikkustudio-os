import { ForbiddenError } from '@pikku/core/errors'
import type { InboxAccess } from './types.js'

export async function assertCanView(
  access: InboxAccess | undefined,
  session: { userId?: string } | undefined,
  projectKey: string
) {
  if (access && !(await access.canView(session, projectKey))) {
    throw new ForbiddenError('Only people on this project can see its emails')
  }
}
