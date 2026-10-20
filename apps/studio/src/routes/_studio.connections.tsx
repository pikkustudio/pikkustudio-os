import { createFileRoute } from '@tanstack/react-router'
import { ConnectionsScreen } from '@pikkustudio/blocks/screens/ConnectionsScreen'

export const Route = createFileRoute('/_studio/connections')({ component: ConnectionsScreen })
