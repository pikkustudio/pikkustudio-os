import type { I18nNode } from '@pikku/react'
import { m } from '@/i18n/messages'
import { Button } from '../ui/button'
import { FabricPitch } from './FabricPitch'
import { useAccount } from '../lib/onboarding'
import { useCopy } from '../lib/copy'

export const CLOUD_URL = 'https://cloud.pikkustudio.app'

export function CloudPanel({ avatar, variant, onClose }: { avatar: I18nNode; variant?: 'a' | 'b'; onClose: () => void }) {
  const account = useAccount()
  const copy = useCopy()
  return <FabricPitch href={account.data?.consoleUrl ?? copy.pitchHref ?? CLOUD_URL} variant={variant} avatar={avatar} onClose={onClose} />
}

export function CloudOffer({ open }: { open: (panel: 'pitch') => void }) {
  return (
    <Button variant="outline" size="page" type="button" onClick={() => open('pitch')}>
      {m.cloud_panel__open()}
    </Button>
  )
}
