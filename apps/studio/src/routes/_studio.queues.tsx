import { createFileRoute } from '@tanstack/react-router'
import { QueuesScreen } from '@pikkustudio/blocks/screens/QueuesScreen'

export const Route = createFileRoute('/_studio/queues')({ component: QueuesScreen })
