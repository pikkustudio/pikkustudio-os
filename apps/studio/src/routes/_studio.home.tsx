import { createFileRoute } from '@tanstack/react-router'
import { OverviewScreen } from '@pikkustudio/blocks/screens/OverviewScreen'

export const Route = createFileRoute('/_studio/home')({ component: OverviewScreen })
