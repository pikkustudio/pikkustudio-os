import { useContext, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Check, Clock, LoaderCircle, PenLine, Search, TriangleAlert, Undo2, X } from 'lucide-react'
import { Button, buttonVariants } from '../ui/button'
import { Input } from '../ui/input'
import { Art } from '../blocks/ExploreHub'
import { NextCard } from '../blocks/NextCard'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { Dot, RowCard } from '../blocks/RowCard'
import { RoadBand, RoadStepStrip, RoadStop, type RoadNodeKind } from '../blocks/RoadSpine'
import { Segmented } from '../blocks/Segmented'
import { SidePanel } from '../blocks/SidePanel'
import { heads, steps, versions, type Outcome } from '../mocks/versions'
import { keep } from '../lib/links'
import { ShellCtx } from '../lib/shell'

const sample = { app: 'Sunrise Bakery Classes', url: 'https://sunrise.bakeryclasses.example' }

const label: Record<Outcome, string> = { live: 'Live', 'was-live': 'Was live', failed: "Didn't go live", 'rolled-back': 'Went back from it', cancelled: 'Cancelled', working: 'Publishing', waiting: 'Waiting for you' }
const tone: Record<Outcome, 'ok' | 'warn' | 'bad' | 'quiet'> = { live: 'ok', 'was-live': 'quiet', failed: 'bad', 'rolled-back': 'quiet', cancelled: 'quiet', working: 'quiet', waiting: 'warn' }
const icon = { live: Check, 'was-live': Clock, failed: TriangleAlert, 'rolled-back': Undo2, cancelled: X, working: LoaderCircle, waiting: Clock }
const nodeOf: Record<Outcome, RoadNodeKind> = { live: 'live', 'was-live': 'past', failed: 'failed', 'rolled-back': 'back', cancelled: 'cancelled', working: 'working', waiting: 'waiting' }
const wentLive = (o: Outcome) => o === 'live' || o === 'was-live' || o === 'rolled-back'
const side = (o: Outcome) => o === 'failed' || o === 'cancelled'

export function LabRoadListScreen() {
  const { say } = useContext(ShellCtx)
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [panel, setPanel] = useState<string | null>(null)
  const live = versions.find((v) => v.outcome === 'live')
  const working = versions.find((v) => v.outcome === 'working')
  const waiting = versions.find((v) => v.outcome === 'waiting')
  const ahead = versions.filter((v) => v.outcome === 'working' || v.outcome === 'waiting')
  const behind = useMemo(() => {
    const term = q.trim().toLowerCase()
    return versions.filter((v) => v.outcome !== 'working' && v.outcome !== 'waiting' && v.outcome !== 'live' && (filter === 'all' || (filter === 'live' ? wentLive(v.outcome) : !wentLive(v.outcome))) && (!term || v.title.toLowerCase().includes(term)))
  }, [filter, q])
  const days = [...new Set(behind.map((v) => v.day))]
  const head = heads[0]
  const open = (id: string, text: string, kind: 'bordered' | 'ghost' = 'bordered') => (
    <Link {...keep} to={'/lab/road/$id' as never} params={{ id } as never} className={buttonVariants({ variant: kind, size: 'compact' })}>
      {text}
    </Link>
  )

  const card = (v: (typeof versions)[number], tail: string) => {
    const I = icon[v.outcome]
    return (
      <RowCard
        flag={v.outcome === 'waiting'}
        on={v.outcome === 'live'}
        tile={<I className={v.outcome === 'working' ? 'size-5 animate-spin' : 'size-5'} />}
        title={v.title}
        caption={v.outcome === 'working' ? `${v.by.split(' ')[0]} · started ${v.started}` : `${v.by === 'GitHub' ? 'Saved from GitHub' : v.by.split(' ')[0]} · ${v.time}${tail ? ` · ${tail}` : ''}`}
        note={v.outcome === 'failed' || v.outcome === 'cancelled' ? v.reason : undefined}
        below={v.outcome === 'working' ? <RoadStepStrip steps={steps} phase={v.phase ?? 0} /> : undefined}
      >
        <Dot tone={tone[v.outcome]}>{label[v.outcome]}</Dot>
        {open(v.id, v.outcome === 'waiting' ? 'Review' : v.outcome === 'working' ? 'Follow' : v.outcome === 'live' ? 'What is in it' : 'Open')}
      </RowCard>
    )
  }

  return (
    <Page gap="snug">
      <PageHead crumb={sample.app} title="Versions" text="The road your app has taken. Newest at the top." size="lead">
        <Button variant="bordered" size="page" className="self-start" onClick={() => setPanel('')}>
          Publish a version
        </Button>
      </PageHead>

      <NextCard
        label="What matters now"
        hue="teal"
        art={<Art />}
        title={waiting ? 'One needs you' : working ? 'On its way' : 'You are live'}
        why={
          waiting
            ? `“${waiting.title}” is built and checked. It needs one setting and one OK from you. Nothing changes for your visitors until you say so.`
            : working
              ? `“${working.title}” is on its way. Your live app is not touched until the last step.`
              : `“${live?.title}” is live. Anything you publish next replaces it.`
        }
      >
        <div className="flex flex-wrap gap-3">
          {waiting || working ? (
            <Link {...keep} to={'/lab/road/$id' as never} params={{ id: (waiting ?? working)!.id } as never} className={buttonVariants({ variant: 'hero', size: 'page' })}>
              {waiting ? 'Review it' : 'Follow it'}
            </Link>
          ) : (
            <Button variant="hero" size="page" onClick={() => setPanel('')}>
              Publish a version
            </Button>
          )}
          <a href={sample.url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'heroGhost', size: 'page' })}>
            Open your app
          </a>
        </div>
      </NextCard>

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

      <div className="flex flex-col">
        {head && (
          <RoadStop kind="hollow" first>
            <div className="flex flex-wrap items-center gap-3.5 rounded-card border border-dashed border-border bg-card px-3.5 py-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-secondary text-ink-2" aria-hidden="true"><PenLine className="size-5" /></span>
              <span className="min-w-0 flex-1 basis-56">
                <b className="block text-[17px] leading-[1.3]">{head.title}</b>
                <small className="block text-[14px] text-ink-2">Saved {head.when} by {head.by.split(' ')[0]}. Not published yet.</small>
              </span>
              <Button variant="bordered" size="compact" onClick={() => setPanel(head.sha)}>
                Publish it
              </Button>
            </div>
          </RoadStop>
        )}

        {ahead.length > 0 && <h2 className="py-2 text-[14px] font-bold text-muted-foreground" style={{ paddingLeft: 28 }}>On its way</h2>}
        {ahead.map((v, i) => (
          <RoadStop key={v.id} kind={nodeOf[v.outcome]} first={false}>
            {card(v, v.outcome === 'waiting' ? 'Needs one setting and one OK. 18 checks passed.' : '')}
          </RoadStop>
        ))}

        {live && (
          <RoadBand>
            Live now. Everyone who opens your app sees “{live.title}”.
          </RoadBand>
        )}
        {live && (filter !== 'not') && (
          <RoadStop kind="live">
            {card(live, `since ${live.liveSince?.toLowerCase()} · ${live.visits} people visited in the last day`)}
          </RoadStop>
        )}

        {days.map((d) => {
          const rows = behind.filter((v) => v.day === d)
          const sum = (['failed', 'was-live', 'rolled-back', 'cancelled'] as Outcome[]).map((o) => [o, rows.filter((v) => v.outcome === o).length] as const).filter(([, n]) => n)
          const words: Record<string, string> = { failed: "didn't go live", 'was-live': 'was live', 'rolled-back': 'went back', cancelled: 'cancelled' }
          return (
            <div key={d} className="flex flex-col">
              <h3 className="relative flex flex-wrap items-baseline gap-x-3 py-2 text-[14px] font-bold text-muted-foreground" style={{ paddingLeft: 28 }}>
                <span aria-hidden="true" className="absolute bg-border" style={{ left: 13, width: 2, top: 0, bottom: 0 }} />
                {d}
                <small className="text-[13px] font-normal">{sum.map(([o, n]) => `${n} ${words[o]}`).join(', ')}</small>
              </h3>
              {rows.map((v, i) => (
                <RoadStop key={v.id} kind={nodeOf[v.outcome]} side={side(v.outcome)} dashed={false} last={d === days[days.length - 1] && i === rows.length - 1}>
                  {card(v, '')}
                </RoadStop>
              ))}
            </div>
          )
        })}
        {behind.length === 0 && <p className="text-[14px] text-ink-2" style={{ paddingLeft: 28 }}>No version matches.</p>}
      </div>

      <p className="max-w-ch62 text-[14px] text-ink-2">Versions stepped to the side never went live, so nobody saw them. The road carried on without them.</p>

      {panel !== null && <PublishPanel start={panel} onClose={() => setPanel(null)} onGo={(t) => (setPanel(null), say(`Get “${t}” ready to publish`))} />}
    </Page>
  )
}

function PublishPanel({ start, onClose, onGo }: { start: string; onClose: () => void; onGo: (title: string) => void }) {
  const options = [
    ...heads.map((h) => ({ id: h.sha, title: h.title, line: `Saved ${h.when} by ${h.by}` })),
    ...versions.filter((v) => v.outcome !== 'working' && v.outcome !== 'live').slice(0, 3).map((v) => ({ id: v.id, title: v.title, line: `Already built · ${v.day}, ${v.time}` })),
  ]
  const [pick, setPick] = useState(start || options[0].id)
  const chosen = options.find((o) => o.id === pick)!
  return (
    <SidePanel title="Publish a version" sub="I check it first, then ask you before anything goes live." onClose={onClose}>
      <fieldset className="flex flex-col gap-2.5">
        <legend className="mb-1 text-[14px] font-semibold">Which one?</legend>
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={pick === o.id} onClick={() => setPick(o.id)} className={`flex flex-col items-start rounded-card border px-4 py-3 text-left transition-colors ${pick === o.id ? 'border-primary bg-accent' : 'border-border bg-card hover:bg-secondary'}`}>
            <b className="text-[16px]">{o.title}</b>
            <small className="text-[14px] text-ink-2">{o.line}</small>
          </button>
        ))}
      </fieldset>
      <div className="flex gap-3">
        <Button variant="default" size="page" onClick={() => onGo(chosen.title)}>Check it</Button>
        <Button variant="bordered" size="page" onClick={onClose}>Cancel</Button>
      </div>
    </SidePanel>
  )
}
