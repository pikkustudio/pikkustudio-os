import { createFileRoute } from '@tanstack/react-router'
import { ChecksScreen } from '@pikkustudio/blocks/screens/ChecksScreen'

export const Route = createFileRoute('/_studio/checks')({ component: ChecksScreen })
