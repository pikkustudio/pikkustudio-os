import { useContext, useMemo, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
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
import { heads as allHeads, steps, versions, type Version } from '../mocks/versions'
import { keep } from '../lib/links'
import { ShellCtx } from '../lib/shell'

const sample = { app: 'Sunrise Bakery Classes', url: 'https://sunrise.bakeryclasses.example' }

const blurb = (v: Version) =>
  v.outcome === 'failed' ? `${failWords[v.failedAt ?? 'build']}. Your live app stayed up.` : v.outcome === 'cancelled' ? 'A newer version replaced it before it went live.' : v.outcome === 'waiting' ? 'Built and checked. It needs a few things from you first.' : v.outcome === 'working' ? `${steps[v.phase ?? 0][0]}, step ${(v.phase ?? 0) + 1} of ${steps.length}. Your live app is not touched yet.` : v.summary

export function VersionsScreen() {
  const { say } = useContext(ShellCtx)
  const [heads, setHeads] = useState(allHeads)
  const [more, setMore] = useState(false)
  const [view, setView] = useState('cards')
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [panel, setPanel] = useState<{ kind: 'back'; v: Version } | { kind: 'publish' } | null>(null)
  const live = versions.find((v) => v.outcome === 'live')
  const working = versions.find((v) => v.outcome === 'working')
  const waiting = versions.find((v) => v.outcome === 'waiting')

  const match = (v: Version) => !q.trim() || v.title.toLowerCase().includes(q.trim().toLowerCase())
  const shelf = useMemo(() => versions.filter((v) => (v.outcome === 'was-live' || v.outcome === 'rolled-back') && match(v)), [q])
  const missed = useMemo(() => versions.filter((v) => (v.outcome === 'failed' || v.outcome === 'cancelled') && match(v)), [q])
  const showWent = filter !== 'not'
  const showMissed = filter !== 'live'
  const open = (id: string, text: string) => (
    <Link {...keep} to={'/versions/$id' as never} params={{ id } as never} className="rounded-sm text-foreground no-underline hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
      {text}
    </Link>
  )
  const openBtn = (id: string, text: string) => (
    <Link {...keep} to={'/versions/$id' as never} params={{ id } as never} className={buttonVariants({ variant: 'bordered', size: 'compact' })}>
      {text}
    </Link>
  )
  const grid = (items: ReactNode[]) => (view === 'rows' ? <RowStack>{items}</RowStack> : <div className="grid grid-cols-3 gap-3.5">{items}</div>)
  const tile = (v: Version, action: ReactNode) => {
    if (view === 'rows') {
      const p = shelfPart(v)
      return (
        <RowCard key={v.id} flag={v.outcome === 'waiting'} tile={<p.icon className="size-5" />} title={open(v.id, v.title)} caption={blurb(v)} note={`${who(v)} · ${when(v)}`}>
          <Dot tone={shelfTone[v.outcome]}>{shelfWords[v.outcome]}</Dot>
          {action}
        </RowCard>
      )
    }
    const p = shelfPart(v)
    return (
      <ShelfTile key={v.id} hue={p.hue} icon={p.icon} flag={v.outcome === 'waiting'} safe={canGoBack(v.outcome)} title={open(v.id, v.title)} text={blurb(v)} status={shelfWords[v.outcome]} tone={shelfTone[v.outcome]} meta={`${who(v)} · ${when(v)}`}>
        {action}
      </ShelfTile>
    )
  }

  return (
    <Page gap="snug">
      <PageHead crumb={sample.app} title="Versions" text="Your app's saved snapshots. One is live; the rest are on the shelf." size="lead">
        <Segmented label="How to show versions" value={view} options={[['cards', 'Cards'], ['rows', 'Rows']]} onChange={setView} />
      </PageHead>

      <NextCard
        label="What matters now"
        hue="teal"
        art={<Art />}
        title={waiting ? 'One needs you' : working ? 'One is on its way' : 'You are live'}
        why={
          waiting
            ? `“${waiting.title}” is built and checked. It goes live when you say so, and nothing changes for your visitors until then.`
            : working
              ? `“${working.title}” is being put together. Your live app is not touched until the last step.`
              : `“${live?.title}” is what people see. Anything you publish next replaces it, and you can always go back.`
        }
      >
        <div className="flex flex-wrap gap-3">
          {waiting || working ? (
            <Link {...keep} to={'/versions/$id' as never} params={{ id: (waiting ?? working)!.id } as never} className={buttonVariants({ variant: 'hero', size: 'page' })}>
              {waiting ? 'Review it' : 'Follow it'}
            </Link>
          ) : (
            <a href={sample.url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'hero', size: 'page' })}>
              Open your app
            </a>
          )}
          {(waiting || working) && (
            <a href={sample.url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'heroGhost', size: 'page' })}>
              Open your app
            </a>
          )}
        </div>
      </NextCard>

      {live && (
        <Section title="What people see now">
          <ShelfTile wide hue="sea" icon={shelfPart(live).icon} title={open(live.id, live.title)} text={live.summary} status="Live" tone="ok" meta={`Live since ${live.liveSince?.toLowerCase()} · ${who(live)} · ${live.visits} people visited in the last day`}>
            {openBtn(live.id, 'What is in it')}
          </ShelfTile>
        </Section>
      )}

      <Section title="Not live yet" sub={heads.length ? `You are ${heads.length === 1 ? 'one change' : `${heads.length} changes`} ahead of what people see. Publishing takes all of them together.` : undefined}>
        {heads.length === 0 ? (
          <RowCard on tile={<Check className="size-5" />} title="You are up to date" caption="Everything you have saved is what people see now." />
        ) : (
          <>
            {grid(
              (more ? heads : heads.slice(0, 3)).map((h) =>
                view === 'rows' ? (
                  <RowCard key={h.sha} tile={<Pencil className="size-5" />} title={h.title} caption={`${h.by} · ${h.when}`}>
                    <Dot tone="quiet">Not published</Dot>
                  </RowCard>
                ) : (
                  <ShelfTile key={h.sha} dashed hue="grey" icon={Pencil} title={h.title} text="Saved, not published yet." status="Not published" meta={`${h.by} · ${h.when}`} />
                ),
              ),
            )}
            <div className="flex flex-wrap gap-3">
              {heads.length > 3 && (
                <Button variant="ghost" size="page" onClick={() => setMore(!more)}>
                  {more ? 'Show fewer' : `See ${heads.length - 3} more`}
                </Button>
              )}
            <Button variant="bordered" size="page" className="self-start" onClick={() => setPanel({ kind: 'publish' })}>
              {heads.length === 1 ? 'Publish this change' : `Publish all ${heads.length} changes`}
            </Button>
            </div>
          </>
        )}
      </Section>

      <Section title="On the shelf" sub="Every one that went live is safe to go back to. Newest first.">
        <div className="flex flex-wrap items-center gap-3">
          <Segmented
            label="Which versions"
            value={filter}
            options={[
              ['all', 'All'],
              ['live', 'Went live'],
              ['not', "Didn't go live"],
            ]}
            onChange={setFilter}
          />
          <span className="relative min-w-0 flex-1 basis-56">
            <Search className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input shape="pill" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a version" aria-label="Find a version" className="h-12 border-[1.5px] border-input bg-card pl-11 text-[16px]" />
          </span>
        </div>
        {showWent && shelf.length > 0 && (
          grid(
            shelf.map((v) =>
              tile(
                v,
                canGoBack(v.outcome) ? (
                  <Button variant="bordered" size="compact" onClick={() => setPanel({ kind: 'back', v })}>
                    Go back to this
                  </Button>
                ) : (
                  openBtn(v.id, 'Open')
                ),
              ),
            ),
          )
        )}
        {showMissed && missed.length > 0 && (
          <>
            <h3 className="text-[14px] font-bold text-muted-foreground">Didn&apos;t go live</h3>
            {grid(
              missed.map((v) =>
                tile(
                  v,
                  v.outcome === 'failed' ? (
                    <Button variant="bordered" size="compact" onClick={() => say(`Try “${v.title}” again`)}>
                      Try again
                    </Button>
                  ) : (
                    openBtn(v.id, 'Open')
                  ),
                ),
              ),
            )}
          </>
        )}
        {(!showWent || shelf.length === 0) && (!showMissed || missed.length === 0) && <p className="text-[14px] text-ink-2">No version matches.</p>}
      </Section>

      {panel?.kind === 'back' && (
        <SidePanel title="Go back to this version?" sub="What people see now is replaced. You can switch again any time." onClose={() => setPanel(null)}>
          <p className="text-[16px] text-ink-2">
            Your visitors get “{panel.v.title}” within a minute. “{live?.title}” goes back on the shelf. Nothing is deleted.
          </p>
          <div className="flex gap-3">
            <Button variant="default" size="page" onClick={() => (setPanel(null), say(`Go back to “${panel.v.title}”`))}>
              Yes, go back
            </Button>
            <Button variant="bordered" size="page" onClick={() => setPanel(null)}>
              Keep what is live
            </Button>
          </div>
        </SidePanel>
      )}
      {panel?.kind === 'publish' && <PublishPanel heads={heads} onClose={() => setPanel(null)} onGo={(t) => (setPanel(null), setHeads([]), say(`Get ${t} ready to publish`))} />}
    </Page>
  )
}

function PublishPanel({ heads, onClose, onGo }: { heads: typeof allHeads; onClose: () => void; onGo: (title: string) => void }) {
  return (
    <SidePanel title={`Publish ${heads.length} changes`} sub="They go out together. I check them first, then ask you before anything goes live." onClose={onClose}>
      <RowStack>
        {heads.map((h) => (
          <RowCard key={h.sha} tile={<Pencil className="size-5" />} title={h.title} caption={`${h.by} · ${h.when}`} />
        ))}
      </RowStack>
      <div className="flex gap-3">
        <Button variant="default" size="page" onClick={() => onGo(`${heads.length} changes`)}>
          Check them
        </Button>
        <Button variant="bordered" size="page" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </SidePanel>
  )
}
