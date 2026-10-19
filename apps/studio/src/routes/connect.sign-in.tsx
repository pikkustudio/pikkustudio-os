import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ConnectSignInScreen, type ConnectStatus } from '@pikkustudio/blocks/screens/ConnectScreen'
import { signInHere, signedOAuthQuery } from '@/lib/connect'

function Page() {
  const [status, setStatus] = useState<ConnectStatus>('working')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const query = signedOAuthQuery()
    if (!query) {
      setStatus('failed')
      return
    }
    setStatus('working')
    void signInHere(query)
      .catch(() => null)
      .then((url) => (url ? window.location.assign(url) : setStatus('failed')))
  }, [attempt])
  return <ConnectSignInScreen status={status} onRetry={() => setAttempt((n) => n + 1)} onOpenStudio={() => window.location.assign('/')} />
}

export const Route = createFileRoute('/connect/sign-in')({ ssr: false, component: Page })
