import { createFileRoute } from '@tanstack/react-router'
import { InboxScreen } from '@pikkustudio/blocks/screens/InboxScreen'

export const Route = createFileRoute('/_studio/inbox/')({ component: InboxScreen })
