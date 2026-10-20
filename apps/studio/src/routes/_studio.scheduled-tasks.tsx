import { createFileRoute } from '@tanstack/react-router'
import { ScheduledTasksScreen } from '@pikkustudio/blocks/screens/ScheduledTasksScreen'

export const Route = createFileRoute('/_studio/scheduled-tasks')({ component: ScheduledTasksScreen })
