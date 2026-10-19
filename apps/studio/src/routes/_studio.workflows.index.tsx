import { createFileRoute } from '@tanstack/react-router'
import { WorkflowsScreen } from '@pikkustudio/blocks/screens/WorkflowsScreen'

export const Route = createFileRoute('/_studio/workflows/')({ component: WorkflowsScreen })
