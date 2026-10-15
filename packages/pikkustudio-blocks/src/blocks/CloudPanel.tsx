import type { I18nNode } from '@pikku/react'
import { CloudPitch } from './CloudPitch'
import { useAccount } from '../lib/onboarding'
import { useCopy } from '../lib/copy'

export const CLOUD_URL = 'https://cloud.pikkustudio.app'

export function CloudPanel({ avatar, variant, onClose }: { avatar: I18nNode; variant?: 'a' | 'b'; onClose: () => void }) {
  const account = useAccount()
  const copy = useCopy()
  return <CloudPitch href={account.data?.consoleUrl ?? copy.pitchHref ?? CLOUD_URL} variant={variant} avatar={avatar} onClose={onClose} />
}
