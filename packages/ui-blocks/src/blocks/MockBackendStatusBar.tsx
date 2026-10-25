import { Sparkles } from 'lucide-react'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { m } from '@/i18n/messages'
import { useProjectKey } from '../lib/project'
import { Button } from '../ui/button'

type Status = { available: boolean; flagged: unknown[]; unflagged: unknown[]; screens: number }

/** How many screens run on sample data, project-wide (studio:mockStatus takes only the project key); 0 when none or unknown. */
export const useMockCount = (): number => {
  const key = useProjectKey()
  const status = usePikkuQuery('studio:mockStatus', { key }, { enabled: !!key, refetchInterval: 15000 } as never)
  const data = status.data as Status | undefined
  if (!data?.available) return 0
  const stubs = data.flagged.length + data.unflagged.length
  return stubs === 0 ? 0 : data.screens || stubs
}

/** Above the design chat's input: how many screens run on sample data, and the one button that hands them to the build agent. */
export function MockBackendStatusBar({ onMakeReal, busy }: { onMakeReal: () => void; busy?: boolean }) {
  const key = useProjectKey()
  const status = usePikkuQuery('studio:mockStatus', { key }, { enabled: !!key, refetchInterval: 15000 } as never)
  if (status.isError) {
    return (
      <div className="flex flex-wrap items-center gap-3 border-t border-border bg-card px-5 py-2.5 text-px145 text-ink-2" role="status">
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
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-5 py-2.5">
      <span className="text-px145 text-ink-2" role="status">
        {m.mock_status__sample_data({ count: data.screens })}
      </span>
      <Button variant="default" size="compact" type="button" data-testid="make-it-real" disabled={busy} onClick={onMakeReal}>
        <Sparkles className="size-4.5" />
        {m.mock_status__make_it_real()}
      </Button>
    </div>
  )
}
