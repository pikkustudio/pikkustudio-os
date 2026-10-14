import { createFileRoute } from '@tanstack/react-router'
import { VersionsScreen } from '@pikkustudio/blocks/screens/VersionsScreen'

export const Route = createFileRoute('/_studio/versions/')({ component: VersionsScreen })
