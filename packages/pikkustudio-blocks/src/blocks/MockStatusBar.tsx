import { Sparkles } from 'lucide-react'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { m } from '@/i18n/messages'
import { useProjectKey } from '../lib/project'
import { Button } from '../ui/button'

export function MockStatusBar() {
  const key = useProjectKey()
  const status = usePikkuQuery('studio:mockStatus', { key }, { enabled: !!key, refetchInterval: 15000 } as never)
  if (status.isError) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-px145 text-ink-2" role="status">
        <span>{m.mock_status__failed()}</span>
        <Button variant="bordered" size="compact" type="button" onClick={() => status.refetch()} disabled={status.isFetching}>
          {m.mock_status__retry()}
        </Button>
      </div>
    )
  }
  const data = status.data as { available: boolean; flagged: unknown[]; unflagged: unknown[]; screens: number } | undefined
  if (!data?.available || data.flagged.length + data.unflagged.length === 0) return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <span className="text-px145 text-ink-2" role="status">
        {data.screens === 1 ? m.mock_status__one() : m.mock_status__many({ count: data.screens })}
      </span>
      <div className="flex items-center gap-3">
        <span className="text-px145 text-muted-foreground">{m.mock_status__coming_next()}</span>
        <Button variant="default" size="compact" type="button" disabled>
          <Sparkles className="size-4.5" />
          {m.mock_status__make_it_real()}
        </Button>
      </div>
    </div>
  )
}
