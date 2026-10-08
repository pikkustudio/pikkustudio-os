import { m } from '@/i18n/messages'
import { useContext, useEffect, useMemo, useState } from 'react'
import { Link } from '../blocks/Link'
import { Check, Search, Pencil } from 'lucide-react'
import { Button, buttonVariants } from '../ui/button'
import { Input } from '../ui/input'
import { Art } from '../blocks/ExploreHub'
import { NextCard } from '../blocks/NextCard'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { Section } from '../blocks/Section'
import { Segmented } from '../blocks/Segmented'
import { Dot, RowCard, RowStack } from '../blocks/RowCard'
import { SidePanel } from '../blocks/SidePanel'
import { ShelfTile } from '../blocks/ShelfTile'
import { canGoBack, failWords, shelfPart, shelfTone, shelfWords, when, who } from '../blocks/ShelfMeta'
import { steps, useVersions, type Head, type Version } from '../lib/versions'
import { keep } from '../lib/links'
import { ShellCtx } from '../lib/shell'
import { asI18nStub, type I18nNode, type I18nString } from '@pikku/react'

const sample = { app: asI18nStub('Sunrise Bakery Classes'), url: 'https://sunrise.bakeryclasses.example' }

const blurb = (v: Version) =>
  v.outcome === 'failed' ? m.versions_screen__blurb_failed({ reason: failWords[v.failedAt ?? 'build']() }) : v.outcome === 'cancelled' ? m.versions_screen__blurb_cancelled() : v.outcome === 'waiting' ? m.versions_screen__blurb_waiting() : v.outcome === 'working' ? m.versions_screen__blurb_working({ step: steps[v.phase ?? 0][0], n: (v.phase ?? 0) + 1, total: steps.length }) : v.summary

export function VersionsScreen() {
  const { say } = useContext(ShellCtx)
  const { versions, heads: allHeads } = useVersions()
  const [heads, setHeads] = useState<Head[]>(allHeads)
  useEffect(() => setHeads(allHeads), [allHeads])
  const [more, setMore] = useState(false)
  const [view, setView] = useState('cards')
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [panel, setPanel] = useState<{ kind: 'back'; v: Version } | { kind: 'publish' } | null>(null)
  const live = versions.find((v) => v.outcome === 'live')
  const working = versions.find((v) => v.outcome === 'working')
  const waiting = versions.find((v) => v.outcome === 'waiting')

  const match = (v: Version) => !q.trim() || v.title.toLowerCase().includes(q.trim().toLowerCase())
  const shelf = useMemo(() => versions.filter((v) => (v.outcome === 'was-live' || v.outcome === 'rolled-back') && match(v)), [q, versions])
  const missed = useMemo(() => versions.filter((v) => (v.outcome === 'failed' || v.outcome === 'cancelled') && match(v)), [q, versions])
  const showWent = filter !== 'not'
  const showMissed = filter !== 'live'
  const open = (id: string, text: I18nString) => (
    <Link {...keep} to={'/versions/$id' as never} params={{ id } as never} className="rounded-sm text-foreground no-underline hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      {text}
    </Link>
  )
  const openBtn = (id: string, text: I18nString) => (
    <Link {...keep} to={'/versions/$id' as never} params={{ id } as never} className={buttonVariants({ variant: 'bordered', size: 'compact' })}>
      {text}
    </Link>
  )
  const grid = (items: I18nNode[]) => (view === 'rows' ? <RowStack>{items}</RowStack> : <div className="grid grid-cols-3 gap-3.5">{items}</div>)
  const tile = (v: Version, action: I18nNode) => {
    if (view === 'rows') {
      const p = shelfPart(v)
      return (
        <RowCard key={v.id} flag={v.outcome === 'waiting'} tile={<p.icon className="size-5" />} title={open(v.id, v.title)} caption={blurb(v)} note={m.versions_screen__by_when({ by: who(v), when: when(v) })}>
          <Dot tone={shelfTone[v.outcome]}>{shelfWords[v.outcome]()}</Dot>
          {action}
        </RowCard>
      )
    }
    const p = shelfPart(v)
    return (
      <ShelfTile key={v.id} hue={p.hue} icon={p.icon} flag={v.outcome === 'waiting'} safe={canGoBack(v.outcome)} title={open(v.id, v.title)} text={blurb(v)} status={shelfWords[v.outcome]()} tone={shelfTone[v.outcome]} meta={m.version_screen__meta({ who: who(v), when: when(v) })}>
        {action}
      </ShelfTile>
    )
  }

  return (
    <Page gap="snug">
      <PageHead crumb={sample.app} title={m.versions_screen__title()} text={m.versions_screen__intro()} size="lead">
        <Segmented label={m.versions_screen__how_show()} value={view} options={[['cards', m.versions_screen__view_cards()], ['rows', m.versions_screen__view_rows()]]} onChange={setView} />
      </PageHead>

      <NextCard
        label={m.versions_screen__what_matters()}
        hue="teal"
        art={<Art />}
        title={waiting ? m.versions_screen__one_needs_you() : working ? m.versions_screen__one_on_way() : m.versions_screen__you_are_live()}
        why={
          waiting
            ? m.versions_screen__why_waiting({ title: waiting.title })
            : working
              ? m.versions_screen__why_working({ title: working.title })
              : m.versions_screen__why_live({ title: live?.title ?? '' })
        }
      >
        <div className="flex flex-wrap gap-3">
          {waiting || working ? (
            <Link {...keep} to={'/versions/$id' as never} params={{ id: (waiting ?? working)!.id } as never} className={buttonVariants({ variant: 'hero', size: 'page' })}>
              {waiting ? m.versions_screen__review_it() : m.versions_screen__follow_it()}
            </Link>
          ) : (
            <a href={sample.url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'hero', size: 'page' })}>
              {m.version_screen__open_app()}
            </a>
          )}
          {(waiting || working) && (
            <a href={sample.url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'heroGhost', size: 'page' })}>
              {m.version_screen__open_app()}
            </a>
          )}
        </div>
      </NextCard>

      {live && (
        <Section title={m.versions_screen__what_people_see()}>
          <ShelfTile wide hue="sea" icon={shelfPart(live).icon} title={open(live.id, live.title)} text={live.summary} status={m.shelf_meta__live()} tone="ok" meta={m.versions_screen__live_meta({ since: live.liveSince?.toLowerCase() ?? '', who: who(live), visits: live.visits ?? 0 })}>
            {openBtn(live.id, m.versions_screen__whats_in_it())}
          </ShelfTile>
        </Section>
      )}

      <Section title={m.versions_screen__not_live()} sub={heads.length ? (m.versions_screen__ahead({ count: heads.length })) : undefined}>
        {heads.length === 0 ? (
          <RowCard on tile={<Check className="size-5" />} title={m.versions_screen__up_to_date()} caption={m.versions_screen__up_to_date_text()} />
        ) : (
          <>
            {grid(
              (more ? heads : heads.slice(0, 3)).map((h) =>
                view === 'rows' ? (
                  <RowCard key={h.sha} tile={<Pencil className="size-5" />} title={h.title} caption={m.versions_screen__by_when({ by: h.by, when: h.when })}>
                    <Dot tone="quiet">{m.versions_screen__not_published()}</Dot>
                  </RowCard>
                ) : (
                  <ShelfTile key={h.sha} dashed hue="grey" icon={Pencil} title={h.title} text={m.versions_screen__saved_not_published()} status={m.versions_screen__not_published()} meta={m.versions_screen__by_when({ by: h.by, when: h.when })} />
                ),
              ),
            )}
            <div className="flex flex-wrap gap-3">
              {heads.length > 3 && (
                <Button variant="ghost" size="page" onClick={() => setMore(!more)}>
                  {more ? m.versions_screen__show_fewer() : m.versions_screen__see_more({ n: heads.length - 3 })}
                </Button>
              )}
            <Button variant="bordered" size="page" className="self-start" onClick={() => setPanel({ kind: 'publish' })}>
              {m.versions_screen__publish({ n: heads.length })}
            </Button>
            </div>
          </>
        )}
      </Section>

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
        {showWent && shelf.length > 0 && (
          grid(
            shelf.map((v) =>
              tile(
                v,
                canGoBack(v.outcome) ? (
                  <Button variant="bordered" size="compact" onClick={() => setPanel({ kind: 'back', v })}>
                    {m.versions_screen__go_back_to_this()}
                  </Button>
                ) : (
                  openBtn(v.id, m.versions_screen__open())
                ),
              ),
            ),
          )
        )}
        {showMissed && missed.length > 0 && (
          <>
            <h3 className="text-[14px] font-bold text-muted-foreground">{m.version_screen__did_not_go_live()}</h3>
            {grid(
              missed.map((v) =>
                tile(
                  v,
                  v.outcome === 'failed' ? (
                    <Button variant="bordered" size="compact" onClick={() => say(m.versions_screen__try_again_say({ title: v.title }))}>
                      {m.signin__retry()}
                    </Button>
                  ) : (
                    openBtn(v.id, m.versions_screen__open())
                  ),
                ),
              ),
            )}
          </>
        )}
        {(!showWent || shelf.length === 0) && (!showMissed || missed.length === 0) && <p className="text-[14px] text-ink-2">{m.versions_screen__no_match()}</p>}
      </Section>

      {panel?.kind === 'back' && (
        <SidePanel title={m.versions_screen__go_back_title()} sub={m.versions_screen__go_back_sub()} onClose={() => setPanel(null)}>
          <p className="text-[16px] text-ink-2">
            {m.version_screen__go_back_detail({ title: panel.v.title, liveTitle: live?.title ?? '' })}
          </p>
          <div className="flex gap-3">
            <Button variant="default" size="page" onClick={() => (setPanel(null), say(m.versions_screen__go_back_say({ title: panel.v.title })))}>
              {m.version_screen__yes_go_back()}
            </Button>
            <Button variant="bordered" size="page" onClick={() => setPanel(null)}>
              {m.version_screen__keep_live()}
            </Button>
          </div>
        </SidePanel>
      )}
      {panel?.kind === 'publish' && <PublishPanel heads={heads} onClose={() => setPanel(null)} onGo={(t) => (setPanel(null), setHeads([]), say(m.versions_screen__publish_say({ title: t })))} />}
    </Page>
  )
}

function PublishPanel({ heads, onClose, onGo }: { heads: Head[]; onClose: () => void; onGo: (title: string) => void }) {
  return (
    <SidePanel title={m.versions_screen__publish_title({ count: heads.length })} sub={m.versions_screen__publish_sub()} onClose={onClose}>
      <RowStack>
        {heads.map((h) => (
          <RowCard key={h.sha} tile={<Pencil className="size-5" />} title={h.title} caption={m.versions_screen__by_when({ by: h.by, when: h.when })} />
        ))}
      </RowStack>
      <div className="flex gap-3">
        <Button variant="default" size="page" onClick={() => onGo(`${heads.length} changes`)}>
          {m.versions_screen__check_them()}
        </Button>
        <Button variant="bordered" size="page" onClick={onClose}>
          {m.secret_form__cancel()}
        </Button>
      </div>
    </SidePanel>
  )
}
