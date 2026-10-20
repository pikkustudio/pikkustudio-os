import { createFileRoute } from '@tanstack/react-router'
import { PermissionsScreen } from '@pikkustudio/blocks/screens/PermissionsScreen'

export const Route = createFileRoute('/_studio/permissions')({ component: PermissionsScreen })
