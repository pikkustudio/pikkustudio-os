import { createFileRoute } from '@tanstack/react-router'
import { VirtualUsersScreen } from '@pikkustudio/blocks/screens/VirtualUsersScreen'

export const Route = createFileRoute('/_studio/virtual-users')({ component: VirtualUsersScreen })
