import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { unreadOf } from '../services/shell-source.js'

export const NotificationsInput = z.object({ team: z.string().optional() })

export const NotificationsOutput = z.object({ count: z.number().nullable() })

export const notifications = pikkuSessionlessFunc({
  expose: true,
  readonly: true,
  description: "How many of the viewer's notifications are unread. Null where no notification source is contributed, so the bell is hidden.",
  input: NotificationsInput,
  output: NotificationsOutput,
  func: async ({ notificationSource }, { team }, { session }) => ({ count: await unreadOf(notificationSource, { team, session }) }),
})
