import { useContext } from 'react'
import { m } from '@/i18n/messages'
import { asI18n, type I18nNode, type I18nString } from '@pikku/react'
import { BellRing, Send } from 'lucide-react'
import { Button } from '../ui/button'
import { ShellCtx } from '../lib/shell'
import { useProjectQuery } from '../lib/projectRpc'
import { ago, exactTime } from '../lib/audit'
import { useDeveloperDetails } from '../lib/developer-details'
import { Dot } from './RowCard'
import { SidePanel } from './SidePanel'
import { PikkuDot } from './PikkuDot'
import { QueryState } from './QueryState'
import { alertName, deliveryState, hostOf, sourceState, type AlertSource, type Delivery, type DeliveryDetailData } from '../lib/incomingAlerts'

function Fact({ label, children }: { label: I18nString; children: I18nNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-px14 font-bold text-muted-foreground">{label}</dt>
      <dd className="m-0 text-[16px] text-foreground">{children}</dd>
    </div>
  )
}

function Technical({ rows }: { rows: Array<[I18nString, string | null | undefined]> }) {
  const [on] = useDeveloperDetails()
  const shown = rows.filter(([, v]) => v)
  if (!on || shown.length === 0) return null
  return (
    <dl className="m-0 flex flex-col gap-3 rounded-xl bg-secondary p-4">
      {shown.map(([label, value]) => (
        <div key={label} className="flex flex-col gap-0.5">
          <dt className="text-px14 text-ink-2">{label}</dt>
          <dd className="m-0">
            <code dir="ltr" className="block font-mono text-px13 break-words whitespace-pre-wrap">{asI18n(value!)}</code>
          </dd>
        </div>
      ))}
    </dl>
  )
}

export function AlertSourceDetail({ source, now, onClose }: { source: AlertSource; now: number; onClose: () => void }) {
  const { say } = useContext(ShellCtx)
  const name = alertName(source.name)
  const state = sourceState(source)
  const methods = source.meta ? (Array.isArray(source.meta.method) ? source.meta.method : [source.meta.method]).filter(Boolean).map((v) => v.toUpperCase()).join(', ') : null
  return (
    <SidePanel icon={BellRing} label={name} title={name} sub={state.text} onClose={onClose}>
      <dl className="m-0 flex flex-col gap-4">
        <Fact label={m.incoming_alerts__detail_state()}>
          <Dot tone={state.tone}>{state.text}</Dot>
        </Fact>
        {source.meta ? (
          <Fact label={m.incoming_alerts__detail_tells()}>
            {source.meta.events.length === 0 ? (
              m.incoming_alerts__detail_tells_any()
            ) : (
              <ul className="m-0 flex list-none flex-col gap-1 p-0">
                {source.meta.events.map((e) => (
                  <li key={e}>{alertName(e)}</li>
                ))}
              </ul>
            )}
          </Fact>
        ) : null}
        {source.row?.updatedAt ? (
          <Fact label={m.incoming_alerts__detail_changed()}>
            {exactTime(source.row.updatedAt)}
            <small className="block text-px14 text-ink-2">{ago(source.row.updatedAt, now)}</small>
          </Fact>
        ) : null}
        {source.row?.detail && (state.kind === 'manual' || state.kind === 'failed') ? (
          <Fact label={state.kind === 'manual' ? m.incoming_alerts__detail_by_hand() : m.incoming_alerts__detail_said()}>{asI18n(source.row.detail)}</Fact>
        ) : null}
      </dl>
      <Button type="button" variant="default" size="page" className="self-start" onClick={() => say(m.incoming_alerts__ask_source_say({ name, state: state.text }))}>
        <PikkuDot />
        {state.kind === 'failed' || state.kind === 'manual' || state.kind === 'orphan' ? m.incoming_alerts__ask_fix() : m.incoming_alerts__ask_about()}
      </Button>
      <Technical
        rows={[
          [m.incoming_alerts__tech_name(), source.name],
          [m.incoming_alerts__tech_address(), source.meta?.route ?? null],
          [m.incoming_alerts__tech_methods(), methods],
          [m.incoming_alerts__tech_events(), source.meta?.events.join('\n') ?? null],
          [m.incoming_alerts__tech_base(), source.row?.baseUrl ?? null],
          [m.incoming_alerts__tech_status(), source.row?.status ?? null],
          [m.incoming_alerts__tech_detail(), source.row?.detail ?? null],
        ]}
      />
    </SidePanel>
  )
}

export function DeliveryDetail({ projectKey, delivery, now, onClose }: { projectKey: string; delivery: Delivery; now: number; onClose: () => void }) {
  const { say } = useContext(ShellCtx)
  const q = useProjectQuery<DeliveryDetailData | null>(projectKey, 'console:getWebhookDelivery', { deliveryId: delivery.deliveryId })
  const title = delivery.event ? alertName(delivery.event) : m.incoming_alerts__delivery_untitled()
  const state = deliveryState(delivery)
  const host = hostOf(delivery.url)
  return (
    <SidePanel icon={Send} label={title} title={title} sub={m.incoming_alerts__sent_to({ host })} onClose={onClose}>
      <dl className="m-0 flex flex-col gap-4">
        <Fact label={m.incoming_alerts__detail_state()}>
          <Dot tone={state.tone}>{state.text}</Dot>
        </Fact>
        <Fact label={m.incoming_alerts__detail_sent()}>
          {exactTime(delivery.createdAt)}
          <small className="block text-px14 text-ink-2">{ago(delivery.createdAt, now)}</small>
        </Fact>
        {delivery.deliveredAt ? <Fact label={m.incoming_alerts__detail_arrived()}>{exactTime(delivery.deliveredAt)}</Fact> : null}
      </dl>
      <section className="flex flex-col gap-2" aria-label={m.incoming_alerts__tries()}>
        <h3 className="text-px14 font-bold text-muted-foreground">{m.incoming_alerts__tries()}</h3>
        <QueryState query={q} skeleton={<div className="h-16 animate-pulse rounded-card border border-border bg-secondary" />}>
          {(d) =>
            !d || d.attempts.length === 0 ? (
              <p className="text-px15 text-ink-2">{m.incoming_alerts__no_tries()}</p>
            ) : (
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {d.attempts.map((a) => {
                  const ok = !a.error && a.statusCode !== null && a.statusCode < 300
                  return (
                    <li key={a.attemptId} className="flex flex-col gap-1 rounded-card border border-border bg-card px-3.5 py-3">
                      <span className="flex flex-wrap items-center justify-between gap-2">
                        <b className="text-[16px]">{m.incoming_alerts__try_n({ n: a.attemptNumber })}</b>
                        <Dot tone={ok ? 'ok' : 'bad'}>{ok ? m.incoming_alerts__try_ok() : m.incoming_alerts__try_failed()}</Dot>
                      </span>
                      <small className="text-px14 text-ink-2">{ago(a.createdAt, now)}</small>
                    </li>
                  )
                })}
              </ul>
            )
          }
        </QueryState>
      </section>
      {state.kind !== 'delivered' ? (
        <Button type="button" variant="default" size="page" className="self-start" onClick={() => say(m.incoming_alerts__ask_delivery_say({ what: title, host }))}>
          <PikkuDot />
          {m.incoming_alerts__ask_fix()}
        </Button>
      ) : null}
      <Technical
        rows={[
          [m.incoming_alerts__tech_url(), delivery.url],
          [m.incoming_alerts__tech_event(), delivery.event],
          [m.incoming_alerts__tech_id(), delivery.deliveryId],
          ...(q.data?.attempts ?? []).map((a): [I18nString, string | null] => [
            m.incoming_alerts__tech_try({ n: a.attemptNumber }),
            [a.statusCode !== null ? `HTTP ${a.statusCode}` : null, a.error, a.responseBody].filter(Boolean).join('\n') || null,
          ]),
        ]}
      />
    </SidePanel>
  )
}
