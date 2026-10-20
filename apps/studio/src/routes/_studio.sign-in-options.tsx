import { createFileRoute } from '@tanstack/react-router'
import { SignInOptionsScreen } from '@pikkustudio/blocks/screens/SignInOptionsScreen'

export const Route = createFileRoute('/_studio/sign-in-options')({ component: SignInOptionsScreen })
