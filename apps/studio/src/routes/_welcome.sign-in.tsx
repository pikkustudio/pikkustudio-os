import { createFileRoute } from '@tanstack/react-router'
import { OnbSignInScreen } from '@pikkustudio/blocks/screens/OnbSignInScreen'

export const Route = createFileRoute('/_welcome/sign-in')({ component: OnbSignInScreen })
