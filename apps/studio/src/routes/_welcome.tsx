import { createFileRoute, useLocation } from '@tanstack/react-router'
import { OnboardingLayout } from '@pikkustudio/blocks/screens/OnboardingLayout'
import { useAccount } from '@pikkustudio/blocks/lib/onboarding'
import { StudioLoading } from '@pikkustudio/blocks/blocks/StudioLoading'

function WelcomeLayout() {
  const account = useAccount()
  const signIn = useLocation({ select: (l) => l.pathname === '/sign-in' })
  if (signIn && account.isPending) return <StudioLoading />
  return <OnboardingLayout />
}

export const Route = createFileRoute('/_welcome')({ component: WelcomeLayout })
