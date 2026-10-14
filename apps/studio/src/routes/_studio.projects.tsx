import { createFileRoute } from '@tanstack/react-router'
import { ProjectsScreen } from '@pikkustudio/blocks/screens/ProjectsScreen'

export const Route = createFileRoute('/_studio/projects')({ component: ProjectsScreen })
