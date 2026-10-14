import { createFileRoute } from '@tanstack/react-router'
import { StudioMetricsScreen } from '@pikkustudio/blocks/screens/MetricsScreen'

export const Route = createFileRoute('/_studio/studio-metrics')({ component: StudioMetricsScreen })
