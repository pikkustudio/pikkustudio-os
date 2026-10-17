import { asI18n, type I18nNode, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { KeyRound, Link2, SlidersHorizontal } from 'lucide-react'
import { Button } from '../ui/button'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { NextCard } from '../blocks/NextCard'
import { EmptyState } from '../blocks/EmptyState'
import { ErrorState } from '../blocks/ErrorState'
import { QueryState } from '../blocks/QueryState'
import { Dot, RowCard, RowStack } from '../blocks/RowCard'
import { ProjectValueDrawer } from '../blocks/ProjectValueDrawer'
import { useProjectKey, useProjectName } from '../lib/project'
import { useProjectAction } from '../lib/projectRpc'
import { useSlots } from '../lib/slots'
import { useLocalSettings, useSecretsSet, useProjectSecretsMeta, type ProjectSecret, type ProjectValue } from '../lib/projectSecrets'
import { useDeveloperDetails } from '../lib/developer-details'

function Art() {
  return (
    <>
      <circle cx="230" cy="40" r="120" className="fill-w1" />
      <circle cx="50" cy="190" r="100" className="fill-w2" />
      <circle cx="170" cy="130" r="58" className="fill-w3" />
      <circle cx="270" cy="165" r="9" className="fill-coral" />
      <rect x="138" y="112" width="64" height="48" rx="12" className="fill-w6" opacity="0.92" />
      <path d="M152 112V98a18 18 0 0 1 36 0v14" className="stroke-w6" strokeWidth="7" fill="none" strokeLinecap="round" />
      <circle cx="170" cy="136" r="6" className="fill-w2" />
    </>
  )
}

const Group = ({ title, children }: { title: I18nString; children: I18nNode }) => (
  <section className="flex flex-col gap-2" aria-label={title}>
    <h2 className="px-1 pt-2 text-px14 font-bold text-muted-foreground">{title}</h2>
    {children}
  </section>
)

const Skeleton = () => (
  <div className="flex flex-col gap-2">
    {[0, 1, 2].map((i) => (
      <div key={i} className="h-16 animate-pulse rounded-card border border-border bg-secondary" />
    ))}
  </div>
)

const Tech = ({ show, name, id }: { show: boolean; name: string; id: string }) =>
  show ? (
    <dl className="m-0 grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1 rounded-xl bg-secondary px-4 py-3">
      <dt className="text-px14 text-ink-2">{m.project_secrets__tech_name()}</dt>
      <dd className="m-0 min-w-0">
        <code dir="ltr" className="block font-mono text-px13 break-words">{asI18n(name)}</code>
      </dd>
      <dt className="text-px14 text-ink-2">{m.project_secrets__tech_id()}</dt>
      <dd className="m-0 min-w-0">
        <code dir="ltr" className="block font-mono text-px13 break-words">{asI18n(id)}</code>
      </dd>
    </dl>
  ) : null

type Editing = { kind: 'secret' | 'setting'; item: ProjectValue }

export function ProjectSecretsScreen() {
  const key = useProjectKey()
  const app = useProjectName()
  const navigate = useNavigate()
  const { useStageSettings } = useSlots()
  const meta = useProjectSecretsMeta(key)
  const secrets = meta.data?.secrets ?? []
  const settings = meta.data?.settings ?? []
  const settingIds = useMemo(() => settings.map((s) => s.id), [settings])
  const stage = useStageSettings?.(key, settingIds) ?? null
  const local = useSecretsSet(key, secrets.filter((s) => !s.connected).map((s) => s.id), !stage && !!meta.data)
  const localSettings = useLocalSettings(key, settingIds, !stage && !!meta.data)
  const settingsHere = stage ? stage.settings : localSettings.supported ? localSettings.settings : undefined
  const settingsEditable = !!stage || localSettings.supported
  const [editing, setEditing] = useState<Editing | null>(null)
  const [failed, setFailed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [technical] = useDeveloperDetails()
  const setLocal = useProjectAction<{ secretId: string; value: unknown }>(key, 'console:secretSet', ['console:secretHas'])

  const setIds = stage ? (stage.secretIds ? new Set(stage.secretIds) : undefined) : local.set
  const statusError = stage ? stage.error : (local.error ?? localSettings.error)
  const retryStatus = stage
    ? stage.retry
    : () => {
        local.retry()
        localSettings.retry()
      }
  const isSet = (s: ProjectSecret) => s.connected || !!setIds?.has(s.id)
  const settingValue = (id: string) => settingsHere?.[id]
  const missingSecrets = setIds ? secrets.filter((s) => !s.connected && !s.optional && !setIds.has(s.id)) : []
  const missingSettings = settingsHere ? settings.filter((s) => !s.optional && !settingsHere[s.id]?.exists) : []
  const missing = [...missingSecrets.map((item) => ({ kind: 'secret' as const, item })), ...missingSettings.map((item) => ({ kind: 'setting' as const, item }))]
  const known = !!meta.data && !!setIds && (!settingsEditable || settings.length === 0 || !!settingsHere)

  const open = (e: Editing) => {
    setFailed(false)
    setEditing(e)
  }

  const save = async (value: string) => {
    if (!editing) return
    setFailed(false)
    setSaving(true)
    try {
      if (editing.kind === 'secret') {
        if (stage) await stage.saveSecret(editing.item.id, value)
        else await setLocal.mutateAsync({ secretId: editing.item.id, value })
      } else if (stage) {
        await stage.saveSetting(editing.item.id, value)
      } else {
        await localSettings.save(editing.item.id, value)
      }
      setEditing(null)
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  const hero = !known ? null : missing.length ? (
    <NextCard label={m.project_secrets__hero_label()} hue="teal" art={<Art />} title={m.project_secrets__hero_missing({ count: missing.length })} why={m.project_secrets__hero_missing_why()}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Button variant="hero" size="pageLg" type="button" onClick={() => open(missing[0]!)}>
          {m.project_secrets__hero_fill({ name: missing[0]!.item.label })}
        </Button>
      </div>
    </NextCard>
  ) : (
    <NextCard label={m.project_secrets__hero_label()} hue="sea" art={<Art />} title={m.project_secrets__hero_ready()} why={stage ? m.project_secrets__hero_ready_why_published() : m.project_secrets__hero_ready_why()}>
      <span className="inline-flex items-center gap-2.5 text-px16 font-bold">
        <span className="size-3 shrink-0 rounded-full bg-success ring-4 ring-hero-ink/20" />
        {m.project_secrets__hero_count({ count: secrets.length + settings.length })}
      </span>
    </NextCard>
  )

  const secretRow = (s: ProjectSecret) => {
    const has = isSet(s)
    return (
      <RowCard
        key={s.id}
        flag={!has && !s.optional}
        tile={s.connected ? <Link2 className="size-5" /> : <KeyRound className="size-5" />}
        title={asI18n(s.label)}
        caption={s.connected ? m.project_secrets__connected() : !has && s.about ? asI18n(s.about) : undefined}
        below={<Tech show={technical} name={s.name} id={s.id} />}
      >
        {s.connected ? (
          <Button type="button" variant="ghost" size="compactTight" onClick={() => navigate({ to: '/connections' as never, search: ((prev: object) => prev) as never })}>
            {m.project_secrets__open_connections()}
          </Button>
        ) : (
          <>
            {has ? <Dot>{m.project_secrets__saved()}</Dot> : <Dot tone={s.optional ? 'quiet' : 'warn'}>{s.optional ? m.project_secrets__optional() : m.project_secrets__needs_value()}</Dot>}
            <Button type="button" variant="bordered" size="compact" onClick={() => open({ kind: 'secret', item: s })}>
              {has ? m.project_secrets__change() : m.project_secrets__add()}
            </Button>
          </>
        )}
      </RowCard>
    )
  }

  const settingRow = (s: ProjectValue) => {
    const v = settingValue(s.id)
    const has = !!v?.exists
    return (
      <RowCard
        key={s.id}
        flag={!!settingsHere && !has && !s.optional}
        tile={<SlidersHorizontal className="size-5" />}
        title={asI18n(s.label)}
        caption={has && v?.value ? asI18n(v.value) : s.about ? asI18n(s.about) : undefined}
        note={settingsEditable ? undefined : m.project_secrets__setting_local()}
        below={<Tech show={technical} name={s.name} id={s.id} />}
      >
        {settingsEditable ? (
          <>
            {settingsHere && !has ? <Dot tone={s.optional ? 'quiet' : 'warn'}>{s.optional ? m.project_secrets__optional() : m.project_secrets__needs_value()}</Dot> : null}
            <Button type="button" variant="bordered" size="compact" disabled={!settingsHere} onClick={() => open({ kind: 'setting', item: s })}>
              {has ? m.project_secrets__change() : m.project_secrets__add()}
            </Button>
          </>
        ) : null}
      </RowCard>
    )
  }

  return (
    <Page gap="snug">
      <PageHead crumb={app} title={m.project_secrets__title()} text={m.project_secrets__text()} size="lead" developerDetails />
      {hero}
      <QueryState
        query={meta.query}
        skeleton={<Skeleton />}
        empty={() =>
          secrets.length + settings.length ? null : (
            <EmptyState layout="row" icon={KeyRound} title={m.project_secrets__empty()} text={m.project_secrets__empty_text()} />
          )
        }
      >
        {() => (
          <div className="flex min-w-0 flex-col gap-6.5">
            {statusError ? <ErrorState error={statusError} onRetry={retryStatus} /> : null}
            {secrets.length ? (
              <Group title={m.project_secrets__secrets()}>
                <RowStack>{secrets.map(secretRow)}</RowStack>
              </Group>
            ) : null}
            {settings.length ? (
              <Group title={m.project_secrets__settings()}>
                <RowStack>{settings.map(settingRow)}</RowStack>
              </Group>
            ) : null}
          </div>
        )}
      </QueryState>
      {editing ? (
        <ProjectValueDrawer
          key={`${editing.kind}:${editing.item.id}`}
          kind={editing.kind}
          item={editing.item}
          current={editing.kind === 'setting' ? (settingValue(editing.item.id)?.value ?? null) : undefined}
          hasValue={editing.kind === 'secret' ? !!setIds?.has(editing.item.id) : !!settingValue(editing.item.id)?.exists}
          sealed={!!stage}
          saving={saving}
          failed={failed}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </Page>
  )
}
