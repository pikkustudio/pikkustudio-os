import { createFileRoute } from '@tanstack/react-router'
import { LiveConnectionsScreen } from '@pikkustudio/blocks/screens/LiveConnectionsScreen'

export const Route = createFileRoute('/_studio/live-connections')({ component: LiveConnectionsScreen })
