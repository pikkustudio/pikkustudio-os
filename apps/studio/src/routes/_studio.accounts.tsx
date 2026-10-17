import { createFileRoute } from '@tanstack/react-router'
import { AccountsScreen } from '@pikkustudio/blocks/screens/AccountsScreen'

export const Route = createFileRoute('/_studio/accounts')({ component: AccountsScreen })
