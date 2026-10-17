import { createFileRoute } from '@tanstack/react-router'
import { SecurityScreen } from '@pikkustudio/blocks/screens/SecurityScreen'

export const Route = createFileRoute('/_studio/security')({ component: SecurityScreen })
