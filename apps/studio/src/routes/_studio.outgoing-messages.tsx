import { createFileRoute } from '@tanstack/react-router'
import { OutgoingMessagesScreen } from '@pikkustudio/blocks/screens/OutgoingMessagesScreen'

export const Route = createFileRoute('/_studio/outgoing-messages')({ component: OutgoingMessagesScreen })
