import { createFileRoute } from '@tanstack/react-router'
import { ScorersScreen } from '@pikkustudio/blocks/screens/ScorersScreen'

export const Route = createFileRoute('/_studio/scorers')({ component: ScorersScreen })
