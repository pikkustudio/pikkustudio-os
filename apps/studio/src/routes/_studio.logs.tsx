import { createFileRoute } from '@tanstack/react-router'
import { LogsScreen } from '@pikkustudio/blocks/screens/LogsScreen'

export const Route = createFileRoute('/_studio/logs')({ component: LogsScreen })
