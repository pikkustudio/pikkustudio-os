import { createFileRoute } from '@tanstack/react-router'
import { RoutinesScreen } from '@pikkustudio/blocks/screens/RoutinesScreen'

export const Route = createFileRoute('/_studio/routines/')({ component: RoutinesScreen })
