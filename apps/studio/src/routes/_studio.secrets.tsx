import { createFileRoute } from '@tanstack/react-router'
import { SecretsScreen } from '@pikkustudio/blocks/screens/SecretsScreen'

export const Route = createFileRoute('/_studio/secrets')({ component: SecretsScreen })
