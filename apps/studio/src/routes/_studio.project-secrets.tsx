import { createFileRoute } from '@tanstack/react-router'
import { ProjectSecretsScreen } from '@pikkustudio/blocks/screens/ProjectSecretsScreen'

export const Route = createFileRoute('/_studio/project-secrets')({ component: ProjectSecretsScreen })
