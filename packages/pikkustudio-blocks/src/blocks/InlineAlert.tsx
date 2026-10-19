import type { I18nNode, I18nString } from '@pikku/react'
import { CircleAlert } from 'lucide-react'
import { Alert } from '../ui/alert'

export function InlineAlert({
  title,
  body,
  action,
  testId,
}: {
  title: I18nString
  body?: I18nString
  action?: I18nNode
  testId?: string
}) {
  return (
    <Alert variant="problem" data-testid={testId}>
      <div className="grid grid-cols-alert items-center gap-x-4 gap-y-1.5">
        <CircleAlert className="size-7 text-destructive-foreground" />
        <div>
          <b className="mb-0.5 block text-px17">{title}</b>
          {body ? <p className="text-px15 text-pretty text-ink-2">{body}</p> : null}
        </div>
        {action ? <div className="flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </Alert>
  )
}
