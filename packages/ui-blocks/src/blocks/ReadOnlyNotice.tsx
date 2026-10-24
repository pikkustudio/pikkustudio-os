import { asI18n } from '@pikku/react'
import { Eye } from 'lucide-react'
import { m } from '@/i18n/messages'
import { useProjectTarget } from '../lib/project-target'
import { Alert } from '../ui/alert'
import { Button } from '../ui/button'

export function ReadOnlyNotice() {
  const target = useProjectTarget()
  if (!target.readOnly) return null
  const name = asI18n(target.name)
  return (
    <Alert variant="info" role="status" data-testid="read-only-notice">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Eye className="size-6 shrink-0 text-info-foreground" />
        <div className="min-w-0 flex-1">
          <b className="block text-px15">{m.read_only_notice__title({ name })}</b>
          <p className="text-px14 text-pretty text-ink-2">{m.read_only_notice__body({ name })}</p>
        </div>
        {target.openWorkspace ? (
          <Button type="button" size="compact" onClick={target.openWorkspace}>
            {m.read_only_notice__open_workspace()}
          </Button>
        ) : null}
      </div>
    </Alert>
  )
}
