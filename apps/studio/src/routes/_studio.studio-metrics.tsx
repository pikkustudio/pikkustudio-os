import { createFileRoute } from '@tanstack/react-router'
import { StudioMetricsScreen } from '@pikkustudio/blocks/screens/MetricsScreen'
import { localScreen } from '@pikkustudio/blocks/blocks/WebEditionUnavailable'

export const Route = createFileRoute('/_studio/studio-metrics')({ component: localScreen('studio-metrics', StudioMetricsScreen) })
