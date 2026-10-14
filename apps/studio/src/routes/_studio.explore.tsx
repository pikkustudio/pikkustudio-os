import { createFileRoute } from '@tanstack/react-router'
import { ExploreScreen } from '@pikkustudio/blocks/screens/ExploreScreen'

export const Route = createFileRoute('/_studio/explore')({ component: ExploreScreen })
