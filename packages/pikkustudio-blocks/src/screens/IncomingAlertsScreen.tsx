import { asI18n, sep, type I18nNode, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext, useState } from 'react'
import { BellRing, CircleAlert, Inbox, Send } from 'lucide-react'
import { Button } from '../ui/button'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { NextCard } from '../blocks/NextCard'
import { RowCard, RowStack, Dot } from '../blocks/RowCard'
import { EmptyState } from '../blocks/EmptyState'
import { ErrorState } from '../blocks/ErrorState'
import { QueryState } from '../blocks/QueryState'
import { PikkuDot } from '../blocks/PikkuDot'
import { AlertSourceDetail, DeliveryDetail, ReceiptDetail } from '../blocks/IncomingAlertDetail'
import { useProjectKey, useProjectName } from '../lib/project'
import { useProjectAction, useProjectQuery } from '../lib/projectRpc'
import { ShellCtx } from '../lib/shell'
import { ago } from '../lib/audit'
import { alertName, deliveryState, hostOf, mergeSources, receiptState, sourceState, type AlertSource, type Delivery, type Receipt, type SourceMeta, type SourceRow } from '../lib/incomingAlerts'

type Meta = { webhookSourceMeta?: Record<string, SourceMeta> }

const skeleton = <div className="h-24 animate-pulse rounded-card border border-border bg-secondary" />

const Group = ({ title, children }: { title: I18nString; children: I18nNode }) => (
  <section className="flex flex-col gap-2" aria-label={title}>
    <h2 className="px-1 pt-2 text-px14 font-bold text-muted-foreground">{title}</h2>
    {children}
  </section>
)

function Art() {
  return (
    <>
      <circle cx="230" cy="40" r="120" className="fill-w1" />
      <circle cx="50" cy="190" r="100" className="fill-w2" />
      <circle cx="170" cy="120" r="58" className="fill-w3" />
      <circle cx="268" cy="168" r="9" className="fill-coral" />
      <path d="M144 140v-26a26 26 0 0 1 52 0v26l8 10h-68z" className="fill-w6" opacity="0.92" />
      <circle cx="170" cy="160" r="7" className="fill-w6" opacity="0.92" />
    </>
  )
}

const events = (s: AlertSource): I18nString | undefined => {
  const list = s.meta?.events ?? []
  if (list.length === 0) return undefined
  const shown = list.slice(0, 3).map((e) => alertName(e)).join(', ')
  return list.length > 3 ? m.incoming_alerts__tells_more({ what: shown, n: list.length - 3 }) : m.incoming_alerts__tells({ what: shown })
}

const noStore = (error: unknown) => /triggerSourceStore/i.test((error as { message?: string } | null)?.message ?? '')

export function IncomingAlertsScreen() {
  const key = useProjectKey()
  const projectName = useProjectName()
  const { say } = useContext(ShellCtx)
  const [stamp] = useState(() => Date.now())
  const [openSource, setOpenSource] = useState<string | null>(null)
  const [openDelivery, setOpenDelivery] = useState<Delivery | null>(null)
  const [openReceipt, setOpenReceipt] = useState<Receipt | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)

  const meta = useProjectQuery<Meta>(key, 'console:getAllMeta')
  const rows = useProjectQuery<{ sources: SourceRow[] }>(key, 'admin:triggerSourceList', null, { handlesErrors: true })
  const deliveries = useProjectQuery<Delivery[]>(key, 'console:listWebhookDeliveries', { limit: 50 })
  const receipts = useProjectQuery<Receipt[]>(key, 'admin:listIncomingWebhookReceipts', { limit: 50 }, { optional: true, handlesErrors: true })
  const enable = useProjectAction<{ name: string }>(key, 'admin:triggerSourceEnable', ['admin:triggerSourceList'])
  const disable = useProjectAction<{ name: string }>(key, 'admin:triggerSourceDisable', ['admin:triggerSourceList'])
  const forget = useProjectAction<{ name: string }>(key, 'admin:triggerSourceForget', ['admin:triggerSourceList'])

  const now = rows.dataUpdatedAt || stamp
  const unmanaged = rows.isError && noStore(rows.error)
  const all = mergeSources(meta.data?.webhookSourceMeta, rows.data?.sources)
  const orphans = all.filter((s) => sourceState(s).kind === 'orphan')
  const sources = all.filter((s) => sourceState(s).kind !== 'orphan')
  const off = sources.filter((s) => sourceState(s).kind === 'off')
  const trouble = sources.filter((s) => ['failed', 'manual'].includes(sourceState(s).kind))
  const busy = enable.isPending || disable.isPending
  const switching = (name: string) => busy && (enable.variables?.name === name || disable.variables?.name === name)
  const actionFailed = enable.isError || disable.isError || forget.isError

  const head = <PageHead crumb={projectName} title={m.incoming_alerts__title()} text={m.incoming_alerts__text()} size="lead" developerDetails />

  if (meta.isError)
    return (
      <Page gap="snug">
        {head}
        <ErrorState error={meta.error} what={m.incoming_alerts__title()} onRetry={() => void meta.refetch()} retrying={meta.isFetching} />
      </Page>
    )

  const firstOff = !unmanaged && trouble.length === 0 && orphans.length === 0 ? off[0] : undefined
  const loading = meta.isPending || rows.isPending
  const heroTitle = loading
    ? m.incoming_alerts__hero_loading()
    : orphans.length + trouble.length > 0
      ? m.incoming_alerts__hero_needs()
      : sources.length === 0
        ? m.incoming_alerts__hero_none()
        : firstOff
          ? m.incoming_alerts__hero_off({ name: alertName(firstOff.name) })
          : m.incoming_alerts__hero_on()
  const heroWhy = loading
    ? m.incoming_alerts__why_loading()
    : orphans.length + trouble.length > 0
      ? m.incoming_alerts__why_needs()
      : sources.length === 0
        ? m.incoming_alerts__why_none()
        : firstOff
          ? m.incoming_alerts__why_off()
          : m.incoming_alerts__why_on()

  const sourceRow = (s: AlertSource) => {
    const state = sourceState(s)
    const on = !!s.row?.enabled
    const needs = state.kind === 'failed' || state.kind === 'manual'
    return (
      <RowCard
        key={s.name}
        on={state.kind === 'on'}
        flag={needs}
        tile={<BellRing className="size-5" />}
        title={
          <button type="button" className="text-start hover:underline hover:underline-offset-3" onClick={() => (setOpenDelivery(null), setOpenReceipt(null), setOpenSource(s.name))}>
            {alertName(s.name)}
          </button>
        }
        caption={events(s) ?? m.incoming_alerts__tells_any()}
        below={
          needs ? (
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
              <p className="min-w-0 flex-1 basis-64 text-px15 text-ink-2">
                {state.kind === 'manual' ? m.incoming_alerts__manual_text({ name: alertName(s.name) }) : m.incoming_alerts__failed_text({ name: alertName(s.name) })}
              </p>
              <Button type="button" variant="bordered" size="compact" onClick={() => (setOpenDelivery(null), setOpenReceipt(null), setOpenSource(s.name))}>
                {m.incoming_alerts__see_what()}
              </Button>
            </div>
          ) : undefined
        }
      >
        <Dot tone={state.tone}>{state.text}</Dot>
        {unmanaged ? null : (
          <Button
            type="button"
            variant={on ? 'ghost' : 'bordered'}
            size="compact"
            disabled={busy}
            aria-busy={switching(s.name)}
            onClick={() => (on ? disable : enable).mutate({ name: s.name })}
          >
            {on ? m.incoming_alerts__turn_off() : m.incoming_alerts__turn_on()}
          </Button>
        )}
      </RowCard>
    )
  }

  const shownSource = all.find((s) => s.name === openSource)

  return (
    <Page gap="snug">
      {head}
      <NextCard label={m.incoming_alerts__title()} hue="teal" art={<Art />} title={heroTitle} why={heroWhy}>
        <div>
          {firstOff ? (
            <Button variant="hero" size="pageLg" type="button" disabled={busy} aria-busy={switching(firstOff.name)} onClick={() => enable.mutate({ name: firstOff.name })}>
              {m.incoming_alerts__hero_turn_on({ name: alertName(firstOff.name) })}
            </Button>
          ) : (
            <Button variant="hero" size="pageLg" type="button" onClick={() => say(sources.length === 0 ? m.incoming_alerts__connect_say() : m.incoming_alerts__ask_say())}>
              <PikkuDot />
              {sources.length === 0 && !loading ? m.incoming_alerts__hero_connect() : m.incoming_alerts__hero_ask()}
            </Button>
          )}
        </div>
      </NextCard>

      {actionFailed ? (
        <p role="alert" className="flex items-center gap-2 px-1 text-px15 text-destructive-foreground">
          <CircleAlert className="size-4.5" />
          {m.incoming_alerts__action_failed()}
        </p>
      ) : null}

      <div className="flex min-w-0 flex-col gap-6.5">
        {orphans.length > 0 ? (
          <Group title={m.incoming_alerts__needs_you()}>
            <RowStack>
              {orphans.map((s) => (
                <RowCard
                  key={s.name}
                  flag
                  tile={<BellRing className="size-5" />}
                  title={
                    <button type="button" className="text-start hover:underline hover:underline-offset-3" onClick={() => (setOpenDelivery(null), setOpenReceipt(null), setOpenSource(s.name))}>
                      {alertName(s.name)}
                    </button>
                  }
                  caption={m.incoming_alerts__orphan_text({ name: alertName(s.name) })}
                >
                  {confirm === s.name ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="ghost" size="compact" onClick={() => setConfirm(null)}>
                        {m.incoming_alerts__keep_it()}
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="compact"
                        disabled={forget.isPending}
                        aria-busy={forget.isPending}
                        onClick={() => forget.mutate({ name: s.name }, { onSuccess: () => setConfirm(null) })}
                      >
                        {m.incoming_alerts__forget_yes()}
                      </Button>
                    </span>
                  ) : (
                    <Button type="button" variant="bordered" size="compact" onClick={() => setConfirm(s.name)}>
                      {m.incoming_alerts__forget()}
                    </Button>
                  )}
                </RowCard>
              ))}
            </RowStack>
          </Group>
        ) : null}

        <Group title={m.incoming_alerts__sources()}>
          {loading ? (
            skeleton
          ) : sources.length === 0 ? (
            <EmptyState layout="row" icon={BellRing} title={m.incoming_alerts__empty()} text={m.incoming_alerts__empty_text()}>
              <Button type="button" size="page" onClick={() => say(m.incoming_alerts__connect_say())}>
                <PikkuDot />
                {m.incoming_alerts__hero_connect()}
              </Button>
            </EmptyState>
          ) : (
            <>
              {unmanaged ? <p className="px-1 text-px15 text-ink-2">{m.incoming_alerts__unmanaged()}</p> : null}
              {rows.isError && !unmanaged ? <ErrorState error={rows.error} what={m.incoming_alerts__sources()} onRetry={() => void rows.refetch()} retrying={rows.isFetching} /> : null}
              <RowStack>{sources.map(sourceRow)}</RowStack>
            </>
          )}
        </Group>

        {receipts.isSuccess && (receipts.data.length > 0 || sources.length > 0) ? (
          <Group title={m.incoming_alerts__received()}>
            {receipts.data.length === 0 ? (
              <p className="px-1 text-px15 text-ink-2">{m.incoming_alerts__received_none()}</p>
            ) : (
              <RowStack>
                {receipts.data.map((r) => {
                  const state = receiptState(r)
                  const title = alertName(r.event)
                  const from = alertName(r.source)
                  return (
                    <RowCard
                      key={r.receiptId}
                      flag={state.kind === 'failed'}
                      tile={<Inbox className="size-5" />}
                      title={
                        <button type="button" className="text-start hover:underline hover:underline-offset-3" onClick={() => (setOpenSource(null), setOpenDelivery(null), setOpenReceipt(r))}>
                          {title}
                        </button>
                      }
                      caption={m.incoming_alerts__received_from({ source: from })}
                      note={<>{ago(r.createdAt, receipts.dataUpdatedAt || stamp)}{r.attempts > 1 ? <>{sep(' · ')}{m.incoming_alerts__tries_count({ n: r.attempts })}</> : null}</>}
                    >
                      <Dot tone={state.tone}>{state.text}</Dot>
                      {state.kind === 'failed' ? (
                        <Button type="button" variant="bordered" size="compact" onClick={() => say(m.incoming_alerts__ask_receipt_say({ what: title, source: from, error: asI18n(r.lastError ?? '') }))}>
                          <PikkuDot />
                          {m.incoming_alerts__ask_fix()}
                        </Button>
                      ) : null}
                    </RowCard>
                  )
                })}
              </RowStack>
            )}
          </Group>
        ) : null}

        <Group title={m.incoming_alerts__sent()}>
          <QueryState
            query={deliveries}
            skeleton={skeleton}
            empty={(d) => (d.length ? null : <p className="px-1 text-px15 text-ink-2">{m.incoming_alerts__sent_none()}</p>)}
          >
            {(d) => (
              <RowStack>
                {d.map((x) => {
                  const state = deliveryState(x)
                  return (
                    <RowCard
                      key={x.deliveryId}
                      flag={state.kind === 'failed'}
                      tile={<Send className="size-5" />}
                      title={
                        <button type="button" className="text-start hover:underline hover:underline-offset-3" onClick={() => (setOpenSource(null), setOpenReceipt(null), setOpenDelivery(x))}>
                          {x.event ? alertName(x.event) : m.incoming_alerts__delivery_untitled()}
                        </button>
                      }
                      caption={m.incoming_alerts__sent_to({ host: hostOf(x.url) })}
                      note={<>{ago(x.createdAt, deliveries.dataUpdatedAt || stamp)}{x.attempts > 1 ? <>{sep(' · ')}{m.incoming_alerts__tries_count({ n: x.attempts })}</> : null}</>}
                    >
                      <Dot tone={state.tone}>{state.text}</Dot>
                    </RowCard>
                  )
                })}
              </RowStack>
            )}
          </QueryState>
        </Group>
      </div>

      {shownSource ? <AlertSourceDetail source={shownSource} now={now} onClose={() => setOpenSource(null)} /> : null}
      {openReceipt ? <ReceiptDetail projectKey={key} receipt={openReceipt} now={receipts.dataUpdatedAt || stamp} onClose={() => setOpenReceipt(null)} /> : null}
      {openDelivery ? <DeliveryDetail projectKey={key} delivery={openDelivery} now={deliveries.dataUpdatedAt || stamp} onClose={() => setOpenDelivery(null)} /> : null}
    </Page>
  )
}
