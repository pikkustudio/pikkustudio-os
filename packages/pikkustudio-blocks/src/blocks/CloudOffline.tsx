import { CloudOff } from 'lucide-react'
import { m } from '@/i18n/messages'
import { Button } from '../ui/button'
import { EmptyState } from './EmptyState'

export function CloudOffline({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState icon={CloudOff} title={m.cloud_offline__title()} text={m.cloud_offline__body()}>
      {onRetry ? (
        <Button variant="bordered" type="button" onClick={onRetry}>
          {m.cloud_offline__retry()}
        </Button>
      ) : null}
    </EmptyState>
  )
}
