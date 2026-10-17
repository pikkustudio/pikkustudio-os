import { m } from '@/i18n/messages'
import { useContext, useState } from 'react'
import { Link } from '../blocks/Link'
import { ArrowLeft, Boxes, Check, Clock, Database, FileText, FlaskConical, Globe, History, KeyRound, RefreshCw, Settings, ShieldCheck, Trash2, TriangleAlert, Undo2, Workflow, type LucideIcon } from 'lucide-react'
import { Button, buttonVariants } from '../ui/button'
import { Input } from '../ui/input'
import { Art } from '../blocks/ExploreHub'
import { NextCard } from '../blocks/NextCard'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { PikkuSays } from '../blocks/PikkuSays'
import { PikkuDot } from '../blocks/PikkuDot'
import { Dot, RowCard, RowStack } from '../blocks/RowCard'
import { Section } from '../blocks/Section'
import { SidePanel } from '../blocks/SidePanel'
import { ErrorState } from '../blocks/ErrorState'
import { StatusLine } from '../blocks/StatusLine'
import { ShelfStrip } from '../blocks/ShelfStrip'
import { canGoBack, dayTime, failWords, shelfWords, titleOf, when, who } from '../blocks/ShelfMeta'
import { useReleaseDetail, useReleases, type Release, type ReleaseDetail, type ReleaseGroup, type ReleaseGroupId, type ReleaseMissing, type ReleasesView } from '../lib/releases'
import { keep } from '../lib/links'
import { ShellCtx } from '../lib/shell'
import { asI18n, type I18nString } from '@pikku/react'

const groupLook: Record<ReleaseGroupId, { icon: LucideIcon; label: () => I18nString }> = {
  functions: { icon: Workflow, label: m.version_screen__group_functions },
  routes: { icon: Globe, label: m.version_screen__group_routes },
  jobs: { icon: Clock, label: m.version_screen__group_jobs },
  migrations: { icon: Database, label: m.version_screen__group_migrations },
  secrets: { icon: KeyRound, label: m.version_screen__group_secrets },
  variables: { icon: Settings, label: m.version_screen__group_variables },
  parts: { icon: Boxes, label: m.version_screen__group_parts },
}

const backLink = (
  <Link {...keep} to={'/versions' as never} className={buttonVariants({ variant: 'ghost', size: 'compact' }) + ' self-start'}>
    <ArrowLeft className="rtl:-scale-x-100 size-4" aria-hidden="true" />
    {m.version_screen__all_versions()}
  </Link>
)

export function VersionScreen({ id }: { id: string }) {
  const view = useReleases()
  const v = view.releases.find((x) => x.id === id)
  if (view.state === 'loading')
    return (
      <Page gap="snug">
        <div role="status" aria-busy="true" className="h-64 animate-pulse rounded-hero bg-secondary" />
      </Page>
    )
  if (view.state === 'error')
    return (
      <Page gap="snug">
        <PageHead crumb={m.versions_screen__title()} title={m.versions_screen__title()} size="lead" />
        <ErrorState error={view.error} what={m.versions_screen__title()} onRetry={view.retry} />
        {backLink}
      </Page>
    )
  if (!v)
    return (
      <Page gap="snug">
        <PageHead crumb={m.versions_screen__title()} title={m.version_screen__not_found_title()} text={m.version_screen__not_found_text()} size="lead" />
        {backLink}
      </Page>
    )
  return <Detail v={v} view={view} />
}

const changeWord = { added: m.version_screen__line_new, changed: m.version_screen__line_changed, removed: m.version_screen__line_removed }
const changeTone = { added: 'ok', changed: 'quiet', removed: 'bad' } as const

export function GroupRows({ groups }: { groups: ReleaseGroup[] }) {
  if (!groups.length) return <p className="text-[14px] text-ink-2">{m.version_screen__no_changes()}</p>
  return (
    <RowStack>
      {groups.map((g) => {
        const look = groupLook[g.id]
        return (
          <RowCard
            key={g.id}
            tile={<look.icon className="size-5" />}
            title={look.label()}
            caption={m.version_screen__change({ count: g.items.length })}
            below={
              <ul className="flex flex-col gap-1.5 ps-14.5 text-[16px]">
                {g.items.map((x) => (
                  <li key={x.change + x.name} className="flex flex-wrap items-center gap-3">
                    <span className="w-24 shrink-0">
                      <Dot tone={changeTone[x.change]}>{changeWord[x.change]()}</Dot>
                    </span>
                    <span dir="ltr" className="font-mono text-[14px] break-all">
                      {asI18n(x.name)}
                    </span>
                  </li>
                ))}
              </ul>
            }
          />
        )
      })}
    </RowStack>
  )
}

type Panel = { kind: 'log' } | { kind: 'back' } | { kind: 'discard' } | { kind: 'fill'; item: ReleaseMissing }
type Fault = { text: I18nString; ask: I18nString }

function FaultLine({ fault }: { fault: Fault }) {
  const { say } = useContext(ShellCtx)
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3.5">
      <StatusLine tone="bad" text={fault.text} />
      <Button variant="bordered" size="compact" className="gap-2.25" onClick={() => say(fault.ask)}>
        <PikkuDot />
        {m.versions_screen__ask_pikku()}
      </Button>
    </div>
  )
}

function Detail({ v, view }: { v: Release; view: ReleasesView }) {
  const { say } = useContext(ShellCtx)
  const edit = !view.readOnly && !!view.actions
  const actions = view.actions
  const [panel, setPanel] = useState<Panel | null>(null)
  const [saved, setSaved] = useState<string[]>([])
  const [draft, setDraft] = useState('')
  const [read, setRead] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [fault, setFault] = useState<Fault | null>(null)
  const detail = useReleaseDetail(v.id, true)
  const o = v.status
  const gate = o === 'waiting'
  const title = titleOf(v)
  const live = view.releases.find((x) => x.status === 'live') ?? null
  const missing = v.missing.filter((x) => !saved.includes(x.name))
  const unread = detail.flags.filter((f) => !read.includes(f.id))
  const stale = gate && v.wait === 'config' && v.missing.length === 0
  const ready = gate && missing.length === 0 && unread.length === 0 && v.wait !== 'builder'
  const left = missing.length + unread.length

  const run = async (work: () => Promise<unknown>, failed: Fault) => {
    setBusy(true)
    setFault(null)
    try {
      await work()
      return true
    } catch {
      setFault(failed)
      return false
    } finally {
      setBusy(false)
    }
  }

  const approve = () =>
    run(
      async () => {
        if (v.wait === 'config' && !(await actions!.recheck(v.id))) throw new Error('config')
        await actions!.approve(v.id)
      },
      { text: m.version_screen__approve_failed(), ask: m.version_screen__approve_failed_ask({ title }) },
    )

  const hero = {
    waiting:
      v.wait === 'builder'
        ? { hue: 'petrol', title: m.version_screen__hero_builder_title(), why: m.version_screen__hero_builder_why() }
        : { hue: 'petrol', title: ready ? m.version_screen__hero_ready_title() : m.version_screen__hero_waiting_title(), why: ready ? m.version_screen__hero_ready_why() : m.version_screen__hero_waiting_why({ count: left }) },
    working: { hue: 'teal', title: m.version_screen__hero_working_title(), why: v.progress ? asI18n(v.progress) : m.version_screen__hero_working_why() },
    live: { hue: 'sea', title: m.version_screen__hero_live_title(), why: m.version_screen__hero_live_since_why({ since: dayTime(v.liveAt ?? v.at) }) },
    'was-live': { hue: 'petrol', title: m.version_screen__hero_was_live_title(), why: m.version_screen__hero_was_live_why() },
    'rolled-back': { hue: 'petrol', title: m.version_screen__hero_rolled_back_title(), why: m.version_screen__hero_rolled_back_why() },
    cancelled: { hue: 'petrol', title: m.version_screen__hero_cancelled_title(), why: v.reason ? asI18n(v.reason) : m.version_screen__no_reason() },
    failed: { hue: 'petrol', title: failWords[v.failedAt ?? 'build'](), why: v.reason ? m.version_screen__hero_failed_why({ reason: asI18n(v.reason) }) : m.version_screen__no_reason() },
  }[o] as { hue: 'teal' | 'petrol' | 'sea'; title: I18nString; why: I18nString }

  return (
    <Page gap="snug">
      <PageHead crumb={m.versions_screen__title()} title={title} text={m.version_screen__byline_short({ who: who(v), when: when(v), version: v.version })} size="lead" />

      <NextCard label={shelfWords[o]()} hue={hero.hue} art={<Art />} title={hero.title} why={hero.why}>
        {o === 'working' ? <ShelfStrip phase={v.step} since={v.at} onHero /> : null}
        <div className="flex flex-wrap gap-3">
          {gate && edit && v.wait !== 'builder' ? (
            <Button variant="hero" size="page" disabled={!ready || busy} onClick={() => void approve()}>
              {m.version_screen__publish()}
            </Button>
          ) : null}
          {o === 'failed' && edit ? (
            <Button variant="hero" size="page" disabled={busy} onClick={() => void run(() => actions!.tryAgain(v.id), { text: m.version_screen__retry_failed(), ask: m.version_screen__say_fix({ title }) })}>
              {m.signin__retry()}
            </Button>
          ) : null}
          {canGoBack(o) && edit && actions?.goBack ? (
            <Button variant="hero" size="page" onClick={() => (setFault(null), setPanel({ kind: 'back' }))}>
              {m.version_screen__go_back()}
            </Button>
          ) : null}
          {o === 'live' && view.url ? (
            <a href={view.url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'hero', size: 'page' })}>
              {m.version_screen__open_app()}
            </a>
          ) : null}
          {gate && edit ? (
            <Button variant="heroGhost" size="page" onClick={() => (setFault(null), setPanel({ kind: 'discard' }))}>
              {m.version_screen__discard()}
            </Button>
          ) : null}
          {o !== 'working' && o !== 'waiting' ? (
            <Button variant="heroGhost" size="page" onClick={() => setPanel({ kind: 'log' })}>
              {m.version_screen__read_log()}
            </Button>
          ) : null}
        </div>
      </NextCard>

      {backLink}

      {fault && !panel ? <FaultLine fault={fault} /> : null}

      {o === 'failed' ? (
        <PikkuSays text={m.version_screen__i_can_read_failed()}>
          <Button variant="bordered" size="compact" onClick={() => say(m.version_screen__say_fix({ title }))}>
            {m.routine_screen__fix_it()}
          </Button>
        </PikkuSays>
      ) : null}

      {gate ? (
        <Section title={m.version_screen__before_it_goes_live()} sub={edit ? m.version_screen__do_these_and_the_publish() : m.version_screen__read_only_gate()}>
          <RowStack>
            {v.missing.map((mi) => {
              const done = saved.includes(mi.name)
              return (
                <RowCard key={mi.name} flag={!done} tile={<KeyRound className="size-5" />} title={asI18n(mi.name)} caption={mi.description ? asI18n(mi.description) : mi.kind === 'secret' ? m.version_screen__missing_secret() : m.version_screen__missing_setting()}>
                  {done ? (
                    <Dot>{m.version_screen__saved()}</Dot>
                  ) : edit ? (
                    <Button variant="bordered" size="compact" onClick={() => (setDraft(''), setFault(null), setPanel({ kind: 'fill', item: mi }))}>
                      {m.version_screen__fill_in()}
                    </Button>
                  ) : (
                    <Dot tone="warn">{m.version_screen__needs_filling()}</Dot>
                  )}
                </RowCard>
              )
            })}
            {stale ? (
              <RowCard tile={<RefreshCw className="size-5" />} title={m.version_screen__stale_title()} caption={m.version_screen__stale_text()}>
                {edit ? (
                  <Button variant="bordered" size="compact" disabled={busy} onClick={() => void run(async () => { if (!(await actions!.recheck(v.id))) throw new Error('config') }, { text: m.version_screen__still_missing(), ask: m.version_screen__approve_failed_ask({ title }) })}>
                    {m.version_screen__check_again()}
                  </Button>
                ) : null}
              </RowCard>
            ) : null}
            {detail.flags.map((f) => {
              const done = read.includes(f.id)
              return (
                <RowCard key={f.id} flag={!done} tile={<TriangleAlert className="size-5" />} title={f.level === 'breaking' ? m.version_screen__flag_breaking() : f.level === 'security' ? m.version_screen__flag_security() : m.version_screen__flag_failed()} caption={asI18n(f.why)} note={asI18n(f.name)}>
                  {done ? (
                    <Button variant="quietMuted" onClick={() => setRead((r) => r.filter((x) => x !== f.id))}>
                      {m.version_screen__read()}
                    </Button>
                  ) : edit ? (
                    <Button variant="bordered" size="compact" onClick={() => setRead((r) => [...r, f.id])}>
                      {m.version_screen__have_read()}
                    </Button>
                  ) : null}
                </RowCard>
              )
            })}
            {v.wait === 'builder' ? <RowCard tile={<History className="size-5" />} title={m.version_screen__hero_builder_title()} caption={m.version_screen__hero_builder_why()} /> : null}
            {!v.missing.length && !detail.flags.length && !stale && v.wait !== 'builder' ? <RowCard on tile={<Check className="size-5" />} title={m.version_screen__nothing_to_do()} caption={m.version_screen__hero_ready_why()} /> : null}
          </RowStack>
        </Section>
      ) : null}

      {o === 'failed' ? (
        <Section title={m.routine_screen__what_went_wrong()}>
          <RowStack>
            <RowCard tile={<TriangleAlert className="size-5" />} title={failWords[v.failedAt ?? 'build']()} caption={v.reason ? asI18n(v.reason) : m.version_screen__no_reason()}>
              <Dot tone="bad">{m.version_screen__did_not_go_live()}</Dot>
            </RowCard>
            {live ? (
              <RowCard on tile={<Check className="size-5" />} title={m.version_screen__live_is_fine()} caption={m.version_screen__still_what_people_see({ title: titleOf(live) })}>
                <Dot>{m.version_screen__still_live()}</Dot>
              </RowCard>
            ) : null}
          </RowStack>
        </Section>
      ) : null}

      <Section title={o === 'live' ? m.version_screen__compared_title() : o === 'working' || gate ? m.version_screen__will_change_title() : m.version_screen__what_is_in_it()} sub={o === 'failed' || o === 'cancelled' ? m.version_screen__would_have_changed() : undefined}>
        <GroupRows groups={v.groups} />
      </Section>

      {o !== 'working' ? <Checks v={v} detail={detail} /> : null}

      {panel?.kind === 'log' ? (
        <SidePanel icon={History} label={m.routine_screen__what_happened()} title={m.routine_screen__what_happened()} sub={m.version_screen__the_record_from_building_and()} onClose={() => setPanel(null)}>
          {detail.logLoading ? (
            <div role="status" aria-busy="true" className="h-48 animate-pulse rounded-card bg-secondary" />
          ) : detail.logError ? (
            <ErrorState error={detail.logError} what={m.routine_screen__what_happened()} />
          ) : detail.log ? (
            <pre dir="ltr" className="max-h-[70vh] overflow-auto rounded-card bg-secondary p-4 font-mono text-[13px] leading-[1.6] whitespace-pre-wrap">
              {asI18n(detail.log)}
            </pre>
          ) : (
            <p className="text-[16px] text-ink-2">{m.version_screen__no_log()}</p>
          )}
          {o === 'failed' ? (
            <Button variant="bordered" size="page" className="gap-2.25 self-start" onClick={() => say(m.version_screen__say_fix({ title }))}>
              <PikkuDot />
              {m.versions_screen__ask_pikku()}
            </Button>
          ) : null}
        </SidePanel>
      ) : null}

      {panel?.kind === 'fill' ? (
        <SidePanel icon={FileText} label={asI18n(panel.item.name)} title={asI18n(panel.item.name)} sub={panel.item.description ? asI18n(panel.item.description) : panel.item.kind === 'secret' ? m.version_screen__missing_secret() : m.version_screen__missing_setting()} onClose={() => setPanel(null)}>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              const item = panel.item
              const value = draft.trim()
              if (!value) return
              void run(() => actions!.fill(item, value), { text: m.version_screen__fill_failed(), ask: m.version_screen__fill_failed_ask({ name: asI18n(item.name) }) }).then((ok) => {
                if (!ok) return
                setSaved((s) => [...s, item.name])
                setDraft('')
                setPanel(null)
              })
            }}
          >
            <Input shape="pill" type={panel.item.kind === 'secret' ? 'password' : 'text'} autoComplete="off" value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={asI18n(panel.item.name)} className="h-12 border-[1.5px] border-input bg-card text-[16px]" />
            {panel.item.kind === 'secret' ? <p className="text-[14px] text-ink-2">{m.version_screen__secret_hidden()}</p> : null}
            <div className="flex gap-3">
              <Button type="submit" variant="default" size="page" disabled={!draft.trim() || busy}>
                {m.version_screen__save()}
              </Button>
              <Button type="button" variant="bordered" size="page" onClick={() => setPanel(null)}>
                {m.shell_layout__not_now()}
              </Button>
            </div>
            {fault ? <FaultLine fault={fault} /> : null}
          </form>
        </SidePanel>
      ) : null}

      {panel?.kind === 'back' ? (
        <SidePanel icon={Undo2} label={m.versions_screen__go_back_title()} title={m.versions_screen__go_back_title()} sub={m.versions_screen__go_back_sub()} onClose={() => setPanel(null)}>
          <p className="text-[16px] text-ink-2">{m.version_screen__go_back_detail({ title, liveTitle: live ? titleOf(live) : m.versions_screen__nothing_live_title() })}</p>
          <div className="flex gap-3">
            <Button variant="destructive" size="page" disabled={busy} onClick={() => void run(() => actions!.goBack!(v.id), { text: m.versions_screen__go_back_failed(), ask: m.versions_screen__go_back_failed_ask({ title }) }).then((ok) => ok && setPanel(null))}>
              {m.version_screen__yes_go_back()}
            </Button>
            <Button variant="bordered" size="page" onClick={() => setPanel(null)}>
              {m.version_screen__keep_live()}
            </Button>
          </div>
          {fault ? <FaultLine fault={fault} /> : null}
        </SidePanel>
      ) : null}

      {panel?.kind === 'discard' ? (
        <SidePanel icon={Trash2} label={m.version_screen__discard_this_version()} title={m.version_screen__discard_this_version()} sub={m.version_screen__it_leaves_your_history_the()} onClose={() => setPanel(null)}>
          <div className="flex gap-3">
            <Button variant="destructive" size="page" disabled={busy} onClick={() => void run(() => actions!.dismiss(v.id), { text: m.version_screen__discard_failed(), ask: m.version_screen__approve_failed_ask({ title }) }).then((ok) => ok && setPanel(null))}>
              {m.version_screen__yes_discard()}
            </Button>
            <Button variant="bordered" size="page" onClick={() => setPanel(null)}>
              {m.secrets_list__keep_it()}
            </Button>
          </div>
          {fault ? <FaultLine fault={fault} /> : null}
        </SidePanel>
      ) : null}
    </Page>
  )
}

function Checks({ v, detail }: { v: Release; detail: ReleaseDetail }) {
  const t = detail.tests
  const flags = detail.flags.length
  return (
    <Section title={m.version_screen__checks()}>
      <RowStack>
        <RowCard
          tile={<FlaskConical className="size-5" />}
          title={m.version_screen__check_works()}
          caption={t ? m.version_screen__tests_count({ passed: t.passed, failed: t.failed, skipped: t.skipped }) : v.status === 'failed' ? m.version_screen__tests_not_run_build() : m.version_screen__tests_not_run()}
        >
          <Dot tone={t ? (t.failed ? 'bad' : 'ok') : 'quiet'}>{t ? (t.failed ? m.version_screen__needs_look() : m.version_screen__all_passed()) : m.version_screen__did_not_run()}</Dot>
        </RowCard>
        <RowCard tile={<ShieldCheck className="size-5" />} title={m.version_screen__check_safe()} caption={flags ? m.version_screen__things({ count: flags }) : m.version_screen__nothing_risky()}>
          <Dot tone={flags ? 'warn' : 'ok'}>{flags ? m.version_screen__read_it() : m.version_screen__nothing_found()}</Dot>
        </RowCard>
      </RowStack>
    </Section>
  )
}
