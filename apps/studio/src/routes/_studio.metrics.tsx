import { createFileRoute } from '@tanstack/react-router'
import { MetricsScreen } from '@pikkustudio/blocks/screens/MetricsScreen'

export const Route = createFileRoute('/_studio/metrics')({ component: MetricsScreen })
