import { m } from '@/i18n/messages'
import { useContext, useState } from 'react'
import { Link } from '../blocks/Link'
import { ArrowLeft, ArrowLeftRight, Check, FileText, FlaskConical, KeyRound, Settings, ShieldCheck, TriangleAlert, Workflow, Undo2, History, Trash2 } from 'lucide-react'
import { Button, buttonVariants } from '../ui/button'
import { Input } from '../ui/input'
import { Art } from '../blocks/ExploreHub'
import { NextCard } from '../blocks/NextCard'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { PikkuSays } from '../blocks/PikkuSays'
import { Dot, RowCard, RowStack } from '../blocks/RowCard'
import { Section } from '../blocks/Section'
import { SidePanel } from '../blocks/SidePanel'
import { ShelfTile } from '../blocks/ShelfTile'
import { ShelfStrip } from '../blocks/ShelfStrip'
import { failWords, ran, shelfPart, shelfTone, shelfWords, when, who } from '../blocks/ShelfMeta'
import { useVersions } from '../lib/versions'
import type { Group, Version } from '../mocks/versions'
import { keep } from '../lib/links'
import { ShellCtx } from '../lib/shell'
import { asI18n, type I18nString } from '@pikku/react'

const sample = { url: 'https://sunrise.bakeryclasses.example' }
const groupIcon: Record<string, typeof FileText> = { Pages: FileText, Routines: Workflow, 'Secret codes': KeyRound, Settings }

const back = (
  <Link {...keep} to={'/versions' as never} className={buttonVariants({ variant: 'ghost', size: 'compact' }) + ' self-start'}>
    <ArrowLeft className="rtl:-scale-x-100 size-4" aria-hidden="true" />
    {m.version_screen__all_versions()}
  </Link>
)

export function VersionScreen({ id }: { id: string }) {
  const { versions, loading } = useVersions()
  const v = versions.find((x) => x.id === id)
  if (!v && loading) return null
  if (!v)
    return (
      <Page gap="snug">
        <PageHead crumb={m.versions_screen__title()} title={m.version_screen__not_found_title()} text={m.version_screen__not_found_text()} size="lead" />
        {back}
      </Page>
    )
  return <Detail v={v} />
}

const lines = (g: Group) => [...g.added.map((x) => ['ok', m.version_screen__line_new(), x] as const), ...g.changed.map((x) => ['quiet', m.version_screen__line_changed(), x] as const), ...g.removed.map((x) => ['bad', m.version_screen__line_removed(), x] as const)]

function GroupRows({ groups }: { groups: Group[] }) {
  return (
    <RowStack>
      {groups.map((g) => {
        const Icon = groupIcon[g.label] ?? FileText
        const l = lines(g)
        return (
          <RowCard
            key={g.label}
            tile={<Icon className="size-5" />}
            title={g.label}
            caption={m.version_screen__change({ count: l.length })}
            below={
              <ul className="flex flex-col gap-1.5 ps-14.5 text-[16px]">
                {l.map(([tone, word, x]) => (
                  <li key={word + x} className="flex flex-wrap items-center gap-3">
                    <span className="w-24 shrink-0">
                      <Dot tone={tone}>{word}</Dot>
                    </span>
                    {x}
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

function Detail({ v }: { v: Version }) {
  const { versions } = useVersions()
  const { say } = useContext(ShellCtx)
  const [panel, setPanel] = useState<'log' | 'back' | 'discard' | 'setting' | null>(null)
  const [saved, setSaved] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [read, setRead] = useState<string[]>([])
  const o = v.outcome
  const gate = o === 'waiting'
  const live = versions.find((x) => x.outcome === 'live')!
  const ready = v.missing.every((m) => saved[m.id]) && v.flags.every((f) => read.includes(f.id))
  const left = v.missing.filter((m) => !saved[m.id]).length + v.flags.filter((f) => !read.includes(f.id)).length

  const hero = {
    waiting: { hue: 'petrol', title: ready ? m.version_screen__hero_ready_title() : m.version_screen__hero_waiting_title(), why: ready ? m.version_screen__hero_ready_why() : m.version_screen__hero_waiting_why({ count: left }) },
    working: { hue: 'teal', title: m.version_screen__hero_working_title(), why: m.version_screen__hero_working_why() },
    live: { hue: 'sea', title: m.version_screen__hero_live_title(), why: m.version_screen__hero_live_why({ since: v.liveSince?.toLowerCase() ?? '', visits: v.visits ?? 0 }) },
    'was-live': { hue: 'petrol', title: m.version_screen__hero_was_live_title(), why: m.version_screen__hero_was_live_why() },
    'rolled-back': { hue: 'petrol', title: m.version_screen__hero_rolled_back_title(), why: m.version_screen__hero_rolled_back_why() },
    cancelled: { hue: 'petrol', title: m.version_screen__hero_cancelled_title(), why: v.reason ?? m.version_screen__no_reason() },
    failed: { hue: 'petrol', title: failWords[v.failedAt ?? 'build'](), why: m.version_screen__hero_failed_why({ reason: v.reason ?? '' }) },
  }[o] as { hue: 'teal' | 'petrol' | 'sea'; title: I18nString; why: I18nString }

  // The one before it (for the live version) is not in the sample, so it is drawn as a plain slot.
  const beforeLive = o === 'live'
  const p = shelfPart(v)
  const lp = shelfPart(live)
  // What switching would undo: the changes of every newer version that actually ran.
  const newer = versions.filter((x) => ran(x.outcome) && versions.indexOf(x) < versions.indexOf(v))

  const status = (x: Version) => shelfWords[x.outcome]()
  const mini = (x: Version, label: I18nString, meta: I18nString, flag?: boolean) => {
    const q = shelfPart(x)
    return <ShelfTile label={label} hue={q.hue} icon={q.icon} flag={flag} title={x.title} text={x.summary} status={status(x)} tone={shelfTone[x.outcome]} meta={meta} />
  }

  return (
    <Page gap="snug">
      <PageHead crumb={m.versions_screen__title()} title={v.title} text={m.version_screen__byline({ who: who(v), when: when(v).toLowerCase(), summary: v.summary })} size="lead" />

      <NextCard label={shelfWords[o]()} hue={hero.hue} art={<Art />} title={hero.title} why={hero.why}>
        {o === 'working' && <ShelfStrip phase={v.phase ?? 0} onHero />}
        <div className="flex flex-wrap gap-3">
          {gate && (
            <Button variant="hero" size="page" disabled={!ready} onClick={() => say(m.version_screen__say_publish({ title: v.title }))}>
              {m.version_screen__publish()}
            </Button>
          )}
          {o === 'failed' && (
            <Button variant="hero" size="page" onClick={() => say(m.version_screen__say_retry({ title: v.title }))}>
              {m.signin__retry()}
            </Button>
          )}
          {o === 'was-live' && (
            <Button variant="hero" size="page" onClick={() => setPanel('back')}>
              {m.version_screen__go_back()}
            </Button>
          )}
          {o === 'live' && (
            <a href={sample.url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'hero', size: 'page' })}>
              {m.version_screen__open_app()}
            </a>
          )}
          {o === 'working' && (
            <Button variant="heroGhost" size="page" onClick={() => say(m.version_screen__say_cancel())}>
              {m.secret_form__cancel()}
            </Button>
          )}
          {(gate || o === 'failed' || o === 'cancelled') && (
            <Button variant="heroGhost" size="page" onClick={() => setPanel('discard')}>
              {m.version_screen__discard()}
            </Button>
          )}
          {o !== 'working' && (
            <Button variant="heroGhost" size="page" onClick={() => setPanel('log')}>
              {m.version_screen__read_log()}
            </Button>
          )}
        </div>
      </NextCard>

      {back}

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-3.5" role="group" aria-label={m.version_screen__compare()}>
        {beforeLive ? (
          <ShelfTile label={m.version_screen__before_this_one()} hue="grey" icon={Undo2} title={m.version_screen__what_it_replaced()} text={m.version_screen__the_version_that_was_live()} status={m.shelf_meta__was_live()} meta={m.version_screen__until({ when: v.liveSince?.toLowerCase() ?? '' })} />
        ) : (
          mini(live, m.version_screen__what_people_see_now(), m.version_screen__live_since({ when: live.liveSince?.toLowerCase() ?? '' }))
        )}
        <span className="grid size-11 shrink-0 self-center place-items-center rounded-full border-[1.5px] border-input bg-card text-ink-2" aria-hidden="true">
          <ArrowLeftRight className="size-5" />
        </span>
        <ShelfTile label={m.version_screen__this_version()} hue={p.hue} icon={p.icon} flag={gate} title={v.title} text={v.summary} status={status(v)} tone={shelfTone[o]} meta={v.took ? m.version_screen__meta_took({ who: who(v), when: when(v), took: v.took }) : m.version_screen__meta({ who: who(v), when: when(v) })} />
      </div>
      {o === 'failed' && (
        <PikkuSays text={m.version_screen__i_can_read_what_happened()}>
          <Button variant="bordered" size="compact" onClick={() => say(m.version_screen__say_fix({ title: v.title }))}>
            {m.routine_screen__fix_it()}
          </Button>
        </PikkuSays>
      )}

      {gate && (
        <Section title={m.version_screen__before_it_goes_live()} sub={m.version_screen__do_these_and_the_publish()}>
          <RowStack>
            {v.missing.map((mi) => {
              const note = saved[mi.id] ?? mi.why
              return (
                <RowCard key={mi.id} flag={!saved[mi.id]} tile={<Settings className="size-5" />} title={mi.name} caption={asI18n(note)}>
                  {saved[mi.id] ? (
                    <Dot>{m.version_screen__saved()}</Dot>
                  ) : (
                    <Button variant="bordered" size="compact" onClick={() => setPanel('setting')}>
                      {m.version_screen__fill_in()}
                    </Button>
                  )}
                </RowCard>
              )
            })}
            {v.flags.map((f) => (
              <RowCard key={f.id} flag={!read.includes(f.id)} tile={<TriangleAlert className="size-5" />} title={f.level === 'breaking' ? m.version_screen__flag_breaking() : f.level === 'security' ? m.version_screen__flag_security() : m.version_screen__flag_failed()} caption={f.text}>
                {read.includes(f.id) ? (
                  <Dot>{m.version_screen__read()}</Dot>
                ) : (
                  <Button variant="bordered" size="compact" onClick={() => setRead((r) => [...r, f.id])}>
                    {m.version_screen__have_read()}
                  </Button>
                )}
              </RowCard>
            ))}
          </RowStack>
        </Section>
      )}

      {(o === 'working' || o === 'waiting' || o === 'live') && (
        <Section title={o === 'live' ? m.version_screen__compared_title() : m.version_screen__will_change_title()}>
          <GroupRows groups={v.groups} />
        </Section>
      )}

      {(o === 'was-live' || o === 'rolled-back') && (
        <Section title={m.version_screen__if_you_switched_this_would()} sub={m.version_screen__compared_with_what_people_see()}>
          <RowStack>
            {newer.map((x) => {
              const items = x.groups.flatMap((g) => [...g.added, ...g.changed])
              const Icon = shelfPart(x).icon
              return (
                <RowCard key={x.id} tile={<Icon className="size-5" />} title={x.title} caption={m.version_screen__would_go_back({ items: items.join(', ') })}>
                  <Dot tone="warn">{m.version_screen__would_stop()}</Dot>
                </RowCard>
              )
            })}
            {v.groups.map((g) => {
              const Icon = groupIcon[g.label] ?? FileText
              const touched = [...g.added, ...g.changed].join(', ')
              return (
                <RowCard key={g.label} tile={<Icon className="size-5" />} title={m.version_screen__group_in_version({ label: g.label })} caption={asI18n(touched)}>
                  <Dot>{m.version_screen__would_come_back()}</Dot>
                </RowCard>
              )
            })}
          </RowStack>
        </Section>
      )}

      {o === 'failed' && (
        <Section title={m.routine_screen__what_went_wrong()}>
          <RowStack>
            <RowCard tile={<TriangleAlert className="size-5" />} title={failWords[v.failedAt ?? 'build']()} caption={v.reason}>
              <Dot tone="bad">{m.version_screen__did_not_go_live()}</Dot>
            </RowCard>
            <RowCard on tile={<Check className="size-5" />} title={m.version_screen__live_is_fine()} caption={m.version_screen__still_what_people_see({ title: live.title })}>
              <Dot>{m.version_screen__still_live()}</Dot>
            </RowCard>
          </RowStack>
        </Section>
      )}

      {(o === 'was-live' || o === 'rolled-back' || o === 'failed' || o === 'cancelled') && (
        <Section title={m.version_screen__what_is_in_it()} sub={o === 'failed' || o === 'cancelled' ? m.version_screen__would_have_changed() : undefined}>
          <GroupRows groups={v.groups} />
        </Section>
      )}

      {o !== 'working' && (
        <Section title={m.version_screen__checks()}>
          <RowStack>
            <RowCard tile={<FlaskConical className="size-5" />} title={m.version_screen__check_works()} caption={v.tests ? m.version_screen__tests_line({ passed: v.tests.passed, failed: v.tests.failed ? m.version_screen__tests_failed({ n: v.tests.failed }) : '', skipped: v.tests.skipped ? m.version_screen__tests_skipped({ n: v.tests.skipped }) : '', secs: v.tests.secs }) : o === 'failed' ? m.version_screen__tests_not_run_build() : m.version_screen__tests_not_run()}>
              <Dot tone={v.tests ? (v.tests.failed ? 'bad' : 'ok') : 'quiet'}>{v.tests ? (v.tests.failed ? m.version_screen__needs_look() : m.version_screen__all_passed()) : m.version_screen__did_not_run()}</Dot>
            </RowCard>
            <RowCard tile={<ShieldCheck className="size-5" />} title={m.version_screen__check_safe()} caption={v.flags.length ? (m.version_screen__things({ count: v.flags.length })) : v.tests ? m.version_screen__nothing_risky() : m.version_screen__not_checked_line()}>
              <Dot tone={v.flags.length ? 'warn' : v.tests ? 'ok' : 'quiet'}>{v.flags.length ? m.version_screen__read_it() : v.tests ? m.version_screen__nothing_found() : m.version_screen__not_checked()}</Dot>
            </RowCard>
          </RowStack>
        </Section>
      )}

      {panel === 'log' && (
        <SidePanel icon={History} label={m.routine_screen__what_happened()} title={m.routine_screen__what_happened()} sub={m.version_screen__the_record_from_building_and()} onClose={() => setPanel(null)}>
          <pre dir="ltr" className="overflow-auto rounded-card bg-secondary p-4 font-mono text-[13px] leading-[1.6] whitespace-pre-wrap">{asI18n(v.log)}</pre>
        </SidePanel>
      )}
      {panel === 'setting' && (
        <SidePanel icon={FileText} label={v.missing[0]?.name ?? m.version_screen__fill_it_in()} title={v.missing[0]?.name ?? m.version_screen__fill_it_in()} sub={v.missing[0]?.why} onClose={() => setPanel(null)}>
          {v.missing.map((mi) => (
            <form
              key={mi.id}
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                if (draft[mi.id]?.trim()) (setSaved((s) => ({ ...s, [mi.id]: draft[mi.id].trim() })), setPanel(null))
              }}
            >
              <Input shape="pill" value={draft[mi.id] ?? ''} onChange={(e) => setDraft((d) => ({ ...d, [mi.id]: e.target.value }))} placeholder={mi.placeholder} aria-label={mi.name} className="h-12 border-[1.5px] border-input bg-card text-[16px]" />
              <div className="flex gap-3">
                <Button type="submit" variant="default" size="page" disabled={!draft[mi.id]?.trim()}>
                  {m.version_screen__save()}
                </Button>
                <Button type="button" variant="bordered" size="page" onClick={() => setPanel(null)}>
                  {m.shell_layout__not_now()}
                </Button>
              </div>
            </form>
          ))}
        </SidePanel>
      )}
      {panel === 'back' && (
        <SidePanel icon={Undo2} label={m.versions_screen__go_back_title()} title={m.versions_screen__go_back_title()} sub={m.versions_screen__go_back_sub()} onClose={() => setPanel(null)}>
          <p className="text-[16px] text-ink-2">
            {m.version_screen__go_back_detail({ title: v.title, liveTitle: live.title })}
          </p>
          <div className="flex gap-3">
            <Button variant="default" size="page" onClick={() => (setPanel(null), say(m.version_screen__say_go_back({ title: v.title })))}>
              {m.version_screen__yes_go_back()}
            </Button>
            <Button variant="bordered" size="page" onClick={() => setPanel(null)}>
              {m.version_screen__keep_live()}
            </Button>
          </div>
        </SidePanel>
      )}
      {panel === 'discard' && (
        <SidePanel icon={Trash2} label={m.version_screen__discard_this_version()} title={m.version_screen__discard_this_version()} sub={m.version_screen__it_leaves_your_history_the()} onClose={() => setPanel(null)}>
          <div className="flex gap-3">
            <Button variant="destructive" size="page" onClick={() => (setPanel(null), say(m.version_screen__say_discard({ title: v.title })))}>
              {m.version_screen__yes_discard()}
            </Button>
            <Button variant="bordered" size="page" onClick={() => setPanel(null)}>
              {m.secrets_list__keep_it()}
            </Button>
          </div>
        </SidePanel>
      )}
    </Page>
  )
}
