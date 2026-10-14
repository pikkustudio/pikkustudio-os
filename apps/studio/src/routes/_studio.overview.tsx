import { createFileRoute } from '@tanstack/react-router'
import { ProjectHomeGate } from '@pikkustudio/blocks/screens/ProjectHomeGate'

export const Route = createFileRoute('/_studio/overview')({ component: ProjectHomeGate })
