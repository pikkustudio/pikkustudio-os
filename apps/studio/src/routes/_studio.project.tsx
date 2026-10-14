import { createFileRoute } from '@tanstack/react-router'
import { ProjectScreen } from '@pikkustudio/blocks/screens/ProjectScreen'

export const Route = createFileRoute('/_studio/project')({ component: ProjectScreen })
