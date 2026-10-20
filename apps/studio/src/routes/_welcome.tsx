import { createFileRoute, useLocation } from '@tanstack/react-router'
import { OnboardingLayout } from '@pikkustudio/blocks/screens/OnboardingLayout'
import { useAccount } from '@pikkustudio/blocks/lib/onboarding'
import { StudioLoading } from '@pikkustudio/blocks/blocks/StudioLoading'
import { leaveIfSignedIn } from '@/lib/studio-gate'

function WelcomeLayout() {
  const account = useAccount()
  const signIn = useLocation({ select: (l) => l.pathname === '/sign-in' })
  if (signIn && account.isPending) return <StudioLoading />
  return <OnboardingLayout />
}

// Sign-in sends a signed-in visitor on to where they were going. It is checked here, not on the sign-in route, so a
// first-party addon's sign-in screen that replaces the core one keeps it.
export const Route = createFileRoute('/_welcome')({
  beforeLoad: ({ location, search }) => (location.pathname === '/sign-in' ? leaveIfSignedIn({ search: search as never }) : undefined),
  component: WelcomeLayout,
})
