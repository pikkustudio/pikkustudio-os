import { createFileRoute } from '@tanstack/react-router'
import { SecretsScreen } from '@pikkustudio/blocks/screens/SecretsScreen'
import { localScreen } from '@pikkustudio/blocks/blocks/WebEditionUnavailable'

export const Route = createFileRoute('/_studio/secrets')({ component: localScreen('secrets', SecretsScreen) })
