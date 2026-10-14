import { createFileRoute } from '@tanstack/react-router'
import { leaveIfSignedIn } from '@/lib/studio-gate'
import { OnbSignInScreen } from '@pikkustudio/blocks/screens/OnbSignInScreen'

export const Route = createFileRoute('/_welcome/sign-in')({ beforeLoad: leaveIfSignedIn, component: OnbSignInScreen })
