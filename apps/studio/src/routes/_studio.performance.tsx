import { createFileRoute } from '@tanstack/react-router'
import { PerformanceScreen } from '@pikkustudio/blocks/screens/PerformanceScreen'

export const Route = createFileRoute('/_studio/performance')({ component: PerformanceScreen })
