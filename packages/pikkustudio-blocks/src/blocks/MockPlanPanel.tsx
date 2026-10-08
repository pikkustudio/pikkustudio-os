import { CircleAlert, Hammer, RefreshCw } from 'lucide-react'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { m } from '@/i18n/messages'
import { useProjectKey } from '../lib/project'
import { EmptyState } from './EmptyState'
import { ErrorState } from './ErrorState'
import { RowCard, RowStack } from './RowCard'
import { SidePanel } from './SidePanel'
import { Spinner } from './Spinner'
import { asI18n, type I18nNode, type I18nString } from '@pikku/react'

type Plan = {
  available: boolean
  added: { rpc: string; scenarios: string[] }[]
  changed: { rpc: string; reason: string }[]
  invalid: { rpc: string; reason: string }[]
}

const words = (rpc: string): I18nString => {
  const text = rpc.replace(/[:.]/g, ' ')
  const spoken = text.charAt(0).toUpperCase() + text.slice(1)
  return asI18n(spoken)
}

function Group({ title, kind, children }: { title: I18nString; kind: string; children: I18nNode }) {
  return (
    <section aria-label={title} data-kind={kind}>
      <h3 className="mb-2 font-heading text-[18px] font-bold">{title}</h3>
      <RowStack>{children}</RowStack>
    </section>
  )
}

export function MockPlanPanel({ onClose }: { onClose: () => void }) {
  const key = useProjectKey()
  const plan = usePikkuQuery('studio:mockPlan', { key }, { enabled: !!key } as never)
  const data = plan.data as Plan | undefined
  const total = data ? data.added.length + data.changed.length + data.invalid.length : 0
  return (
    <SidePanel title={m.mock_plan__title()} sub={m.mock_plan__sub()} onClose={onClose}>
      <div data-testid="mock-plan" aria-busy={plan.isFetching} className="flex flex-col gap-5">
        {plan.isError || (data && !data.available) ? (
          <ErrorState error={plan.error ?? new Error('The project could not read its sample data.')} what={m.mock_plan__what()} onRetry={() => plan.refetch()} retrying={plan.isFetching} />
        ) : !data ? (
          <p className="flex items-center gap-2.5 text-[16px] text-ink-2" role="status">
            <Spinner />
            {m.mock_plan__loading()}
          </p>
        ) : total === 0 ? (
          <EmptyState title={m.mock_plan__empty_title()} text={m.mock_plan__empty_text()} icon={RefreshCw} />
        ) : (
          <>
            {data.added.length ? (
              <Group title={m.mock_plan__added_title()} kind="added">
                {data.added.map((a) => (
                  <div key={a.rpc} data-testid="mock-plan-row" data-kind="added" data-rpc={a.rpc}>
                    <RowCard tile={<Hammer className="size-5" />} title={words(a.rpc)} caption={m.mock_plan__added_line({ scenarios: a.scenarios.join(', ') })} note={asI18n(a.rpc)} />
                  </div>
                ))}
              </Group>
            ) : null}
            {data.changed.length ? (
              <Group title={m.mock_plan__changed_title()} kind="changed">
                {data.changed.map((c) => (
                  <div key={c.rpc} data-testid="mock-plan-row" data-kind="changed" data-rpc={c.rpc}>
                    <RowCard flag tile={<CircleAlert className="size-5" />} title={words(c.rpc)} caption={asI18n(c.reason)} note={asI18n(c.rpc)} />
                  </div>
                ))}
              </Group>
            ) : null}
            {data.invalid.length ? (
              <Group title={m.mock_plan__invalid_title()} kind="invalid">
                {data.invalid.map((i) => (
                  <div key={i.rpc} data-testid="mock-plan-row" data-kind="invalid" data-rpc={i.rpc}>
                    <RowCard flag tile={<CircleAlert className="size-5" />} title={words(i.rpc)} caption={asI18n(i.reason)} note={asI18n(i.rpc)} />
                  </div>
                ))}
              </Group>
            ) : null}
            <p className="text-[15px] text-ink-2">{m.mock_plan__note()}</p>
          </>
        )}
      </div>
    </SidePanel>
  )
}
