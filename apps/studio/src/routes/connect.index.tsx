import { useEffect, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ConnectConsentScreen } from '@pikkustudio/blocks/screens/ConnectScreen'
import { answerConsent, oauthClientName, signedOAuthQuery } from '@/lib/connect'

function Page() {
  const { client_id, scope } = Route.useSearch()
  const broken = !client_id || (typeof window !== 'undefined' && !signedOAuthQuery())
  const [client, setClient] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (client_id) void oauthClientName(client_id).then(setClient).catch(() => null)
  }, [client_id])
  const answer = async (accept: boolean) => {
    setBusy(true)
    setFailed(false)
    const url = await answerConsent(accept, accept ? scope || undefined : undefined).catch(() => null)
    if (url) window.location.assign(url)
    else {
      setBusy(false)
      setFailed(true)
    }
  }
  return (
    <ConnectConsentScreen
      client={client}
      broken={broken}
      failed={failed}
      busy={busy}
      onAllow={() => void answer(true)}
      onDeny={() => void answer(false)}
      onOpenStudio={() => window.location.assign('/')}
    />
  )
}

export const Route = createFileRoute('/connect/')({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    client_id: typeof search.client_id === 'string' ? search.client_id : '',
    scope: typeof search.scope === 'string' ? search.scope : '',
  }),
  component: Page,
})
