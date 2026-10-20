import { createFileRoute } from '@tanstack/react-router'
import { IncomingAlertsScreen } from '@pikkustudio/blocks/screens/IncomingAlertsScreen'

export const Route = createFileRoute('/_studio/incoming-alerts')({ component: IncomingAlertsScreen })
