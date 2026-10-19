import { m } from '@/i18n/messages'
import { useContext, useMemo, useState } from 'react'
import { Link } from '../blocks/Link'
import { Pencil, RefreshCw, Search, Undo2 } from 'lucide-react'
import { Button, buttonVariants } from '../ui/button'
import { Input } from '../ui/input'
import { Switch } from '../ui/switch'
import { NextCard } from '../blocks/NextCard'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { Section } from '../blocks/Section'
import { Segmented } from '../blocks/Segmented'
import { Dot, RowCard, RowStack } from '../blocks/RowCard'
import { SidePanel } from '../blocks/SidePanel'
import { ShelfTile } from '../blocks/ShelfTile'
import { ErrorState, detailsOf, faultOf } from '../blocks/ErrorState'
import { StatusLine } from '../blocks/StatusLine'
import { PikkuDot } from '../blocks/PikkuDot'
import { ago, canGoBack, dayTime, failWords, shelfPart, shelfTone, shelfWords, titleOf, versionLine, when, who } from '../blocks/ShelfMeta'
import { stepNames } from '../blocks/ShelfStrip'
import { useReleasePreview, useReleases, type Release, type ReleasesView } from '../lib/releases'
import { useKeyedSlot } from '../lib/studio-slots'
import { useProjectTarget } from '../lib/project-target'
import { GroupRows } from './VersionScreen'
import { useProjectName } from '../lib/project'
import { keep } from '../lib/links'
import { ShellCtx } from '../lib/shell'
import { asI18n, type I18nNode, type I18nString } from '@pikku/react'

const blurb = (v: Release): I18nString => {
  if (v.status === 'failed') return m.versions_screen__blurb_failed({ reason: failWords[v.failedAt ?? 'build']() })
  if (v.status === 'cancelled') return m.versions_screen__blurb_cancelled()
  if (v.status === 'waiting') return m.versions_screen__blurb_waiting()
  if (v.status === 'working') {
    const names = stepNames()
    const step = Math.min(v.step, names.length - 1)
    return m.versions_screen__blurb_working({ step: names[step], n: step + 1, total: names.length })
  }
  return versionLine(v)
}

const matches = (v: Release, q: string) => {
  const s = q.trim().toLowerCase()
  return !s || [v.title ?? '', v.version, v.by ?? ''].some((x) => x.toLowerCase().includes(s))
}

const openLink = (id: string, text: I18nNode) => (
  <Link {...keep} to={'/versions/$id' as never} params={{ id } as never} className="rounded-sm text-foreground no-underline hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
    {text}
  </Link>
)

const openButton = (id: string, text: I18nString, hero?: boolean) => (
  <Link {...keep} to={'/versions/$id' as never} params={{ id } as never} className={buttonVariants(hero ? { variant: 'hero', size: 'page' } : { variant: 'bordered', size: 'compact' })}>
    {text}
  </Link>
)

const publishLink = (variant: 'hero' | 'bordered', text: I18nString) => (
  <Link {...keep} to={'/publish' as never} className={buttonVariants({ variant, size: variant === 'hero' ? 'page' : 'compact' })}>
    {text}
  </Link>
)

export function VersionsScreen() {
  const view = useReleases()
  const projectName = useProjectName()
  const [mode, setMode] = useState('cards')
  return (
    <Page gap="snug">
      <PageHead crumb={projectName} title={m.versions_screen__title()} text={view.place ? m.versions_screen__intro_place({ place: asI18n(view.place) }) : m.versions_screen__intro()} size="lead" developerDetails>
        {view.state === 'ready' && view.releases.length > 0 ? (
          <Segmented label={m.versions_screen__how_show()} value={mode} options={[['cards', m.versions_screen__view_cards()], ['rows', m.versions_screen__view_rows()]]} onChange={setMode} />
        ) : null}
      </PageHead>
      <Body view={view} mode={mode} />
    </Page>
  )
}

function Body({ view, mode }: { view: ReleasesView; mode: string }) {
  const { say } = useContext(ShellCtx)
  if (view.state === 'loading')
    return (
      <div role="status" aria-busy="true" className="flex flex-col gap-3.5">
        <NextCard label={m.versions_screen__what_matters()} hue="teal" page="versions" title={m.versions_screen__hero_loading()} why={m.versions_screen__intro()} />
        <div className="h-40 animate-pulse rounded-card border border-border bg-secondary" />
      </div>
    )
  if (view.state === 'error')
    return (
      <>
        <NextCard label={m.versions_screen__what_matters()} hue="petrol" page="versions" title={m.versions_screen__hero_error()} why={m.versions_screen__hero_error_text()}>
          <div className="flex flex-wrap gap-3">
            <Button variant="hero" size="page" type="button" onClick={() => say(m.error_state__fix_ask_what({ what: m.versions_screen__title(), details: detailsOf(faultOf(view.error), m.versions_screen__title()) }))}>
              <PikkuDot />
              {m.metrics_screen__fix_it()}
            </Button>
          </div>
        </NextCard>
        <ErrorState error={view.error} what={m.versions_screen__title()} onRetry={view.retry} />
      </>
    )
  if (view.state === 'off' || view.releases.length === 0) return <NothingYet view={view} />
  return <History view={view} mode={mode} />
}

function NothingYet({ view }: { view: ReleasesView }) {
  return (
    <>
      <NextCard label={m.versions_screen__what_matters()} hue="teal" page="versions" title={m.versions_screen__none_title()} why={view.state === 'off' ? m.versions_screen__none_why_off() : m.versions_screen__none_why()}>
        {view.readOnly && view.state !== 'off' ? null : <div className="flex flex-wrap gap-3">{publishLink('hero', m.versions_screen__go_publish())}</div>}
      </NextCard>
      <Pending view={view} />
    </>
  )
}

function Pending({ view }: { view: ReleasesView }) {
  const [more, setMore] = useState(false)
  const pending = view.pending
  if (!pending.length) return null
  return (
    <Section title={m.versions_screen__not_live()} sub={m.versions_screen__ahead({ count: pending.length })}>
      <RowStack>
        {(more ? pending : pending.slice(0, 3)).map((h) => (
          <RowCard key={h.id} tile={<Pencil className="size-5" />} title={asI18n(h.title)} caption={m.versions_screen__by_when({ by: who(h), when: ago(h.at) })}>
            <Dot tone="quiet">{m.versions_screen__not_published()}</Dot>
          </RowCard>
        ))}
      </RowStack>
      <div className="flex flex-wrap gap-3">
        {pending.length > 3 ? (
          <Button variant="ghost" size="page" onClick={() => setMore(!more)}>
            {more ? m.versions_screen__show_fewer() : m.versions_screen__see_more({ n: pending.length - 3 })}
          </Button>
        ) : null}
        {publishLink('bordered', m.versions_screen__publish({ n: pending.length }))}
      </div>
    </Section>
  )
}

type Fault = { text: I18nString; ask: I18nString }

function History({ view, mode }: { view: ReleasesView; mode: string }) {
  const { say } = useContext(ShellCtx)
  const { kind } = useProjectTarget()
  const ReleaseMode = useKeyedSlot('versions.releaseMode', kind)
  const ReleaseSent = useKeyedSlot('versions.sent', kind)
  const preview = useReleasePreview()
  const edit = !view.readOnly && !!view.actions
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [back, setBack] = useState<Release | null>(null)
  const [busy, setBusy] = useState(false)
  const [fault, setFault] = useState<Fault | null>(null)
  const releases = view.releases
  const live = releases.find((v) => v.status === 'live') ?? null
  const working = releases.find((v) => v.status === 'working') ?? null
  const waiting = releases.find((v) => v.status === 'waiting') ?? null
  const newest = releases[0]
  const lastFailed = newest && newest.status === 'failed' && (!live || newest.at > live.at) ? newest : null
  const shelf = useMemo(
    () => releases.filter((v) => v !== live && matches(v, q) && (filter === 'all' || (filter === 'live' ? v.status === 'was-live' || v.status === 'rolled-back' : v.status === 'failed' || v.status === 'cancelled'))),
    [releases, live, q, filter],
  )

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

  const hero = waiting
    ? { title: m.versions_screen__one_needs_you(), why: m.versions_screen__why_waiting({ title: titleOf(waiting) }), action: openButton(waiting.id, m.versions_screen__review_it(), true) }
    : working
      ? { title: m.versions_screen__one_on_way(), why: m.versions_screen__why_working({ title: titleOf(working) }), action: openButton(working.id, m.versions_screen__follow_it(), true) }
      : lastFailed
        ? { title: m.versions_screen__last_failed_title(), why: m.versions_screen__last_failed_why({ reason: failWords[lastFailed.failedAt ?? 'build']() }), action: openButton(lastFailed.id, m.versions_screen__see_what_happened(), true) }
        : live
          ? { title: m.versions_screen__you_are_live(), why: m.versions_screen__why_live({ title: titleOf(live) }), action: null }
          : { title: m.versions_screen__nothing_live_title(), why: m.versions_screen__nothing_live_why(), action: edit ? publishLink('hero', m.versions_screen__go_publish()) : null }

  const tile = (v: Release, action: I18nNode) => {
    const p = shelfPart(v)
    if (mode === 'rows')
      return (
        <RowCard key={v.id} flag={v.status === 'waiting'} tile={<p.icon className="size-5" />} title={openLink(v.id, titleOf(v))} caption={blurb(v)} note={m.versions_screen__by_when({ by: who(v), when: when(v) })}>
          <Dot tone={shelfTone[v.status]}>{shelfWords[v.status]()}</Dot>
          {action}
        </RowCard>
      )
    return (
      <ShelfTile key={v.id} hue={p.hue} icon={p.icon} flag={v.status === 'waiting'} safe={canGoBack(v.status)} title={openLink(v.id, titleOf(v))} text={blurb(v)} status={shelfWords[v.status]()} tone={shelfTone[v.status]} meta={m.version_screen__meta({ who: who(v), when: when(v) })}>
        {action}
      </ShelfTile>
    )
  }
  const grid = (items: I18nNode[]) => (mode === 'rows' ? <RowStack>{items}</RowStack> : <div className="grid grid-cols-1 gap-3.5 @min-[760px]/app:grid-cols-2 @min-[1100px]/app:grid-cols-3">{items}</div>)

  return (
    <>
      <NextCard label={m.versions_screen__what_matters()} hue="teal" page="versions" title={hero.title} why={hero.why}>
        <div className="flex flex-wrap gap-3">
          {hero.action}
          {view.url ? (
            <a href={view.url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: hero.action ? 'heroGhost' : 'hero', size: 'page' })}>
              {m.version_screen__open_app()}
            </a>
          ) : null}
        </div>
      </NextCard>

      {fault && !back ? (
        <div role="alert" className="flex flex-wrap items-center gap-3.5">
          <StatusLine tone="bad" text={fault.text} />
          <Button variant="bordered" size="compact" className="gap-2.25" onClick={() => say(fault.ask)}>
            <PikkuDot />
            {m.versions_screen__ask_pikku()}
          </Button>
        </div>
      ) : null}

      <Section title={m.versions_screen__what_people_see()}>
        {live ? (
          <ShelfTile wide hue="sea" icon={shelfPart(live).icon} title={openLink(live.id, titleOf(live))} text={versionLine(live)} status={m.shelf_meta__live()} tone="ok" meta={m.versions_screen__live_since_by({ since: dayTime(live.liveAt ?? live.at), who: who(live) })}>
            {openButton(live.id, m.versions_screen__whats_in_it())}
          </ShelfTile>
        ) : (
          <RowCard tile={<RefreshCw className="size-5" />} title={m.versions_screen__nothing_live_title()} caption={m.versions_screen__nothing_live_why()} />
        )}
        {view.autoUpdate !== null ? (
          <RowCard tile={<RefreshCw className="size-5" />} title={m.versions_screen__auto_title()} caption={view.autoUpdate ? m.versions_screen__auto_on() : m.versions_screen__auto_off()}>
            <Switch
              checked={view.autoUpdate}
              disabled={!edit || busy}
              aria-label={m.versions_screen__auto_title()}
              onCheckedChange={(on) => void run(() => view.actions!.setAutoUpdate(on), { text: m.versions_screen__auto_failed(), ask: m.versions_screen__auto_failed_ask() })}
            >
              {view.autoUpdate ? m.versions_screen__auto_on_short() : m.versions_screen__auto_off_short()}
            </Switch>
          </RowCard>
        ) : null}
        <ReleaseMode />
      </Section>

      <Pending view={view} />

      {preview?.length ? (
        <Section title={m.versions_screen__next_title()} sub={m.versions_screen__next_sub()}>
          <GroupRows groups={preview} />
        </Section>
      ) : null}

      <Section title={m.versions_screen__on_shelf()} sub={m.versions_screen__on_shelf_sub()}>
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label={m.versions_screen__which()}
            value={filter}
            options={[
              ['all', m.versions_screen__filter_all()],
              ['live', m.versions_screen__filter_live()],
              ['not', m.versions_screen__filter_not()],
            ]}
            onChange={setFilter}
          />
          <span className="relative min-w-0 flex-1 basis-56">
            <Search className="pointer-events-none absolute top-1/2 start-4 size-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input shape="pill" value={q} onChange={(e) => setQ(e.target.value)} placeholder={m.versions_screen__find()} aria-label={m.versions_screen__find()} className="h-12 border-[1.5px] border-input bg-card ps-11 text-[16px]" />
          </span>
        </div>
        {shelf.length ? (
          grid(
            shelf.map((v) =>
              tile(
                v,
                edit && view.actions?.goBack && canGoBack(v.status) ? (
                  <Button variant="bordered" size="compact" onClick={() => (setFault(null), setBack(v))}>
                    {m.versions_screen__go_back_to_this()}
                  </Button>
                ) : (
                  openButton(v.id, v.status === 'failed' ? m.versions_screen__see_what_happened() : m.versions_screen__open())
                ),
              ),
            ),
          )
        ) : (
          <p className="text-[14px] text-ink-2">{q.trim() || filter !== 'all' ? m.versions_screen__no_match() : m.versions_screen__shelf_empty()}</p>
        )}
      </Section>

      <ReleaseSent />

      {back ? (
        <SidePanel icon={Undo2} label={m.versions_screen__go_back_title()} title={m.versions_screen__go_back_title()} sub={m.versions_screen__go_back_sub()} onClose={() => setBack(null)}>
          <p className="text-[16px] text-ink-2">{m.version_screen__go_back_detail({ title: titleOf(back), liveTitle: live ? titleOf(live) : m.versions_screen__nothing_live_title() })}</p>
          <div className="flex gap-3">
            <Button
              variant="destructive"
              size="page"
              disabled={busy}
              onClick={() => void run(() => view.actions!.goBack!(back.id), { text: m.versions_screen__go_back_failed(), ask: m.versions_screen__go_back_failed_ask({ title: titleOf(back) }) }).then((ok) => ok && setBack(null))}
            >
              {m.version_screen__yes_go_back()}
            </Button>
            <Button variant="bordered" size="page" onClick={() => setBack(null)}>
              {m.version_screen__keep_live()}
            </Button>
          </div>
          {fault ? (
            <div role="alert" className="flex flex-wrap items-center gap-3.5">
              <StatusLine tone="bad" text={fault.text} />
              <Button variant="bordered" size="compact" className="gap-2.25" onClick={() => say(fault.ask)}>
                <PikkuDot />
                {m.versions_screen__ask_pikku()}
              </Button>
            </div>
          ) : null}
        </SidePanel>
      ) : null}
    </>
  )
}
