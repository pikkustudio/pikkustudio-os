import { createFileRoute } from '@tanstack/react-router'
import { AccountScreen } from '@pikkustudio/blocks/screens/AccountScreen'

export const Route = createFileRoute('/_studio/account')({ component: AccountScreen })
