import { useContext, useMemo, useRef, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, GitCommitHorizontal, Search } from 'lucide-react'
import { Button, buttonVariants } from '../ui/button'
import { Input } from '../ui/input'
import { Art } from '../blocks/ExploreHub'
import { NextCard } from '../blocks/NextCard'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { PikkuSuggests } from '../blocks/PikkuSuggests'
import { Dot, RowCard, RowStack } from '../blocks/RowCard'
import { Segmented } from '../blocks/Segmented'
import { SidePanel } from '../blocks/SidePanel'
import { WeekDayRuler, WeekStrip, dayOf, daySentence, outcomeGlyph, weekDays } from '../blocks/WeekStrip'
import { heads, steps, versions, type Outcome, type Version } from '../mocks/versions'
import { keep } from '../lib/links'
import { ShellCtx } from '../lib/shell'

const sample = { app: 'Sunrise Bakery Classes', url: 'https://sunrise.bakeryclasses.example', weekName: '28 Sep to 4 Oct', todayIdx: 6, now: '12:40' }

const label: Record<Outcome, string> = { live: 'Live', 'was-live': 'Was live', failed: "Didn't go live", 'rolled-back': 'Went back from it', cancelled: 'Cancelled', working: 'Publishing', waiting: 'Waiting for you' }
const tone: Record<Outcome, 'ok' | 'warn' | 'bad' | 'quiet'> = { live: 'ok', 'was-live': 'quiet', failed: 'bad', 'rolled-back': 'quiet', cancelled: 'quiet', working: 'ok', waiting: 'warn' }
const verb: Record<Outcome, string> = { live: 'Open', 'was-live': 'Open', failed: 'Open', 'rolled-back': 'Open', cancelled: 'Open', working: 'Follow', waiting: 'Review' }
const wentLive = (v: Version) => v.outcome === 'live' || v.outcome === 'was-live' || v.outcome === 'rolled-back'

export function LabWeekListScreen() {
  const { say } = useContext(ShellCtx)
  const [filter, setFilter] = useState('all')
  const [q, setQ] = useState('')
  const [weeks, setWeeks] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [panel, setPanel] = useState<string | null>(null)
  const refs = useRef<Record<number, HTMLElement | null>>({})
  const live = versions.find((v) => v.outcome === 'live')
  const working = versions.find((v) => v.outcome === 'working')
  const waiting = versions.find((v) => v.outcome === 'waiting')
  const thisWeek = weeks === 0

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    return versions.filter((v) => (filter === 'all' || (filter === 'live' ? wentLive(v) : !wentLive(v))) && (!term || v.title.toLowerCase().includes(term)))
  }, [filter, q])
  const byDay = weekDays().map((_, i) => (thisWeek ? shown.filter((v) => dayOf(v) === i) : []))
  const dayList = [...byDay.keys()].filter((i) => byDay[i].length).reverse()
  const todayCount = versions.filter((v) => dayOf(v) === sample.todayIdx).length - 1

  const pick = (i: number) => {
    setPicked(i)
    refs.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  const target = waiting ?? working

  return (
    <Page gap="snug">
      <PageHead crumb={sample.app} title="Versions" text="What happened to your app this week." size="lead">
        <Button variant="bordered" size="page" onClick={() => setPanel('')}>
          Publish a version
        </Button>
      </PageHead>

      <NextCard
        label="What matters now"
        hue="teal"
        art={<Art />}
        title={waiting ? 'One needs you' : working ? 'One is on its way' : 'Your app is live'}
        why={
          waiting
            ? `“${waiting.title}” is ready for your OK.${todayCount > 0 ? ` ${todayCount === 1 ? 'One more thing' : 'Two more things'} happened today.` : ''}`
            : working
              ? `“${working.title}” is being put together. Your live app is not touched until the last step.`
              : `“${live?.title}” is live. This week was calm.`
        }
      >
        <div className="flex flex-wrap gap-3">
          {target ? (
            <Link {...keep} to={'/lab/week/$id' as never} params={{ id: target.id } as never} className={buttonVariants({ variant: 'hero', size: 'page' })}>
              {waiting ? 'Review it' : 'Follow it'}
            </Link>
          ) : null}
          <a href={sample.url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'heroGhost', size: 'page' })}>
            Open your app
          </a>
        </div>
      </NextCard>

      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="bordered" size="compact" aria-label="The week before" onClick={() => (setWeeks((w) => w + 1), setPicked(null))}>
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>
          <h2 className="min-w-44 text-center text-[20px] font-bold">{thisWeek ? sample.weekName : weeks === 1 ? '21 to 27 Sep' : `${weeks} weeks ago`}</h2>
          <Button variant="bordered" size="compact" aria-label="The week after" disabled={thisWeek} onClick={() => (setWeeks((w) => w - 1), setPicked(null))}>
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
          <span className="flex-1" />
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
        </div>
        <WeekStrip byDay={byDay} today={thisWeek ? sample.todayIdx : null} picked={picked} onPick={pick} />
        <span className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input shape="pill" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a version by its name" aria-label="Find a version" className="h-12 border-[1.5px] border-input bg-card pl-11 text-[16px]" />
        </span>
      </div>

      {thisWeek && heads.length > 0 && !working && (
        <div className="flex flex-col gap-2">
          {heads.map((h) => (
            <PikkuSuggests key={h.sha} title="Saved, not published" text={`“${h.title}”, saved by ${h.by} ${h.when}. Want me to get it ready to publish?`} yes="Get it ready" no="Not now" />
          ))}
        </div>
      )}

      {dayList.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-[22px] border-[1.5px] border-dashed border-border bg-card p-6">
          <b className="text-[17px]">{q || filter !== 'all' ? 'Nothing matches that this week.' : thisWeek ? 'Nothing happened this week.' : 'A quiet week. Nothing was published.'}</b>
          <p className="text-[15px] text-ink-2">Your live app is “{live?.title}”, since today 09:05.</p>
          <Button variant="default" size="page" onClick={() => setPanel('')}>
            Publish a version
          </Button>
        </div>
      ) : (
        dayList.map((i) => {
          const rows = byDay[i]
          const isToday = i === sample.todayIdx
          return (
            <section key={i} ref={(el) => void (refs.current[i] = el)} aria-label={weekDays()[i].label} className="flex scroll-mt-4 flex-col gap-2.5">
              <h3 className="flex flex-wrap items-baseline gap-x-3 text-[16px] font-bold">
                {weekDays()[i].label}
                <small className="text-[13px] font-normal text-muted-foreground">
                  {isToday ? 'Today. ' : ''}
                  {daySentence(rows)}
                </small>
              </h3>
              <WeekDayRuler items={rows} now={isToday ? sample.now : undefined} />
              <RowStack>
                {rows.map((v) => {
                  const G = outcomeGlyph[v.outcome].Icon
                  return (
                    <RowCard
                      key={v.id}
                      flag={v.outcome === 'waiting'}
                      on={v.outcome === 'live'}
                      tile={<G className={v.outcome === 'working' ? 'size-5 animate-spin' : 'size-5'} />}
                      title={v.title}
                      caption={`${v.time} · ${v.outcome === 'working' ? `Step ${(v.phase ?? 0) + 1} of ${steps.length}, ${steps[v.phase ?? 0][0].toLowerCase()}` : v.by === 'GitHub' ? 'Saved from GitHub' : `By ${v.by}`}`}
                      note={v.outcome === 'failed' || v.outcome === 'cancelled' ? v.reason : undefined}
                    >
                      <Dot tone={tone[v.outcome]}>{label[v.outcome]}</Dot>
                      <Link {...keep} to={'/lab/week/$id' as never} params={{ id: v.id } as never} className={buttonVariants({ variant: 'bordered', size: 'compact' })}>
                        {verb[v.outcome]}
                      </Link>
                    </RowCard>
                  )
                })}
              </RowStack>
            </section>
          )
        })
      )}

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
            <b className="flex items-center gap-2 text-[16px]">
              {heads.some((h) => h.sha === o.id) && <GitCommitHorizontal className="size-4" aria-hidden="true" />}
              {o.title}
            </b>
            <small className="text-[14px] text-ink-2">{o.line}</small>
          </button>
        ))}
      </fieldset>
      <div className="flex gap-3">
        <Button variant="default" size="page" onClick={() => onGo(chosen.title)}>
          Check it
        </Button>
        <Button variant="bordered" size="page" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </SidePanel>
  )
}
