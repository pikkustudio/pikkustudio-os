import { useContext, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, ChevronRight } from 'lucide-react'
import { Button, buttonVariants } from '../ui/button'
import { Input } from '../ui/input'
import { Art } from '../blocks/ExploreHub'
import { NextCard } from '../blocks/NextCard'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { PikkuSuggests } from '../blocks/PikkuSuggests'
import { Dot } from '../blocks/RowCard'
import { SidePanel } from '../blocks/SidePanel'
import { WeekReceipt, ReceiptFact, ReceiptPart } from '../blocks/WeekReceipt'
import { WeekStepStrip } from '../blocks/WeekStepStrip'
import { dayOf, outcomeGlyph, weekDays } from '../blocks/WeekStrip'
import { steps, versions, type Outcome, type Version } from '../mocks/versions'
import { keep } from '../lib/links'
import { ShellCtx } from '../lib/shell'

const sample = { url: 'https://sunrise.bakeryclasses.example' }

const stampWord: Record<Outcome, string> = { live: 'Live', 'was-live': 'Was live', failed: "Didn't go live", 'rolled-back': 'Went back from it', cancelled: 'Cancelled', working: 'Publishing', waiting: 'Waiting for you' }
const failTitle = { build: 'It could not be built', start: 'It built, but would not start', publish: 'It could not be put live', data: 'Your data could not be updated' }
const wentLive = (v: Version) => v.outcome === 'live' || v.outcome === 'was-live' || v.outcome === 'rolled-back'
const dayLabel = (v: Version) => weekDays()[dayOf(v)].label
const stamp = (v: Version) => `${v.day === 'Today' ? 'Today' : v.day === 'Yesterday' ? 'Yesterday' : dayLabel(v)} ${v.time}`

const Name = ({ v }: { v: Version }) => (
  <Link {...keep} to={'/lab/week/$id' as never} params={{ id: v.id } as never} className="font-bold text-primary underline-offset-2 hover:underline">
    {v.title}
  </Link>
)

export function LabWeekVersionScreen({ id }: { id: string }) {
  const i = versions.findIndex((x) => x.id === id)
  if (i < 0)
    return (
      <Page gap="snug">
        <PageHead crumb="Versions" title="We could not find that version" text="It may have been discarded." size="lead" />
        <Link {...keep} to={'/lab/week' as never} className={buttonVariants({ variant: 'default', size: 'page' }) + ' self-start'}>
          This week
        </Link>
      </Page>
    )
  return <Detail v={versions[i]} older={versions[i + 1]} newer={versions[i - 1]} before={versions.slice(i + 1).find(wentLive)} after={versions.slice(0, i).reverse().find(wentLive)} />
}

function Detail({ v, older, newer, before, after }: { v: Version; older?: Version; newer?: Version; before?: Version; after?: Version }) {
  const { say } = useContext(ShellCtx)
  const [panel, setPanel] = useState<'log' | 'back' | 'discard' | 'setting' | 'ack' | null>(null)
  const [saved, setSaved] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState('')
  const [read, setRead] = useState<string[]>([])
  const o = v.outcome
  const gate = o === 'waiting'
  const left = v.missing.filter((m) => !saved[m.id]).length + v.flags.filter((f) => !read.includes(f.id)).length
  const ready = left === 0
  const G = outcomeGlyph[o]
  const notYet = <>Not yet</>
  const nextMissing = v.missing.find((m) => !saved[m.id])
  const nextFlag = v.flags.find((f) => !read.includes(f.id))

  const hero = {
    waiting: { hue: 'petrol', title: ready ? 'Ready when you are' : 'A few things first', why: ready ? 'You have done everything it needed. Nothing changes for your visitors until you press the button.' : `It is built and checked. ${left} ${left === 1 ? 'thing needs' : 'things need'} you before it can go live.` },
    working: { hue: 'teal', title: 'Publishing…', why: 'It is being put together now. You can leave this page; it carries on without you.' },
    live: { hue: 'sea', title: 'You are live', why: `Everyone who opens your app gets this one. It has been live since ${v.liveSince?.toLowerCase()}, with ${v.visits} visitors in the last day.` },
    'was-live': { hue: 'petrol', title: 'This was live', why: `${after ? `“${after.title}” replaced it.` : 'A newer version replaced it.'} You can put it back whenever you like.` },
    'rolled-back': { hue: 'petrol', title: 'You went back', why: 'It went live, then you chose the version before it. Nothing is lost.' },
    cancelled: { hue: 'petrol', title: 'It was cancelled', why: v.reason ?? '' },
    failed: { hue: 'petrol', title: failTitle[v.failedAt ?? 'build'], why: `${v.reason} Your live app stayed exactly as it was, so nobody noticed.` },
  }[o] as { hue: 'teal' | 'petrol' | 'sea'; title: string; why: string }

  const lines = v.groups.flatMap((g) => [...g.added.map((x) => [g.label, 'ok', 'New', x] as const), ...g.changed.map((x) => [g.label, 'quiet', 'Changed', x] as const), ...g.removed.map((x) => [g.label, 'bad', 'Removed', x] as const)])

  return (
    <Page gap="snug">
      <PageHead crumb={`Versions · ${dayLabel(v)}`} title={v.title} text={v.summary} size="lead" />

      <NextCard label={stampWord[o]} hue={hero.hue} art={<Art />} title={hero.title} why={hero.why}>
        <div className="flex flex-wrap gap-3">
          {gate && (
            <Button variant="hero" size="page" disabled={!ready} onClick={() => say(`Publish “${v.title}” to my live site`)}>
              Publish to your live site
            </Button>
          )}
          {o === 'failed' && (
            <Button variant="hero" size="page" onClick={() => say(`Try “${v.title}” again`)}>
              Try again
            </Button>
          )}
          {o === 'was-live' && (
            <Button variant="hero" size="page" onClick={() => setPanel('back')}>
              Go back to this version
            </Button>
          )}
          {o === 'live' && (
            <a href={sample.url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'hero', size: 'page' })}>
              Open your app
            </a>
          )}
          {o === 'working' && (
            <Button variant="heroGhost" size="page" onClick={() => say('Cancel publishing this version')}>
              Cancel
            </Button>
          )}
          {(gate || o === 'failed' || o === 'cancelled') && (
            <Button variant="heroGhost" size="page" onClick={() => setPanel('discard')}>
              Discard
            </Button>
          )}
        </div>
        {o === 'working' && <WeekStepStrip phase={v.phase ?? 0} />}
      </NextCard>

      <Link {...keep} to={'/lab/week' as never} className={buttonVariants({ variant: 'ghost', size: 'compact' }) + ' self-start'}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to the week
      </Link>

      <WeekReceipt
        flag={gate && !ready}
        title={stamp(v)}
        stamp={
          <span className="inline-flex h-8 items-center gap-2 rounded-full border border-border px-3.5 text-[14px] font-bold">
            <G.Icon className={`size-4 ${G.cls} ${o === 'working' ? 'animate-spin' : ''}`} aria-hidden="true" />
            {stampWord[o]}
          </span>
        }
      >
        <ReceiptPart>
          <dl className="flex flex-col gap-1.5">
            <ReceiptFact label="Saved by">{v.by === 'GitHub' ? 'GitHub' : v.by}</ReceiptFact>
            <ReceiptFact label="Saved">{o === 'working' ? `Today ${v.time}, started ${v.started}` : stamp(v)}</ReceiptFact>
            <ReceiptFact label="Went live" soft={!wentLive(v)}>
              {wentLive(v) ? `${v.liveSince}${v.took ? `, took ${v.took}` : ''}` : o === 'working' || o === 'waiting' ? notYet : 'It did not go live'}
            </ReceiptFact>
            {before && wentLive(v) ? (
              <ReceiptFact label={o === 'rolled-back' ? 'You went back to' : 'It replaced'}>
                <Name v={before} />
              </ReceiptFact>
            ) : null}
            {after && o === 'was-live' ? (
              <ReceiptFact label="Replaced by">
                <Name v={after} />, {after.day === 'Today' ? 'today' : after.day.toLowerCase()} {after.time}
              </ReceiptFact>
            ) : null}
            {o === 'cancelled' && v.reason ? <ReceiptFact label="Why">{v.reason}</ReceiptFact> : null}
            {o === 'live' ? <ReceiptFact label="Visitors">{v.visits} in the last day</ReceiptFact> : null}
          </dl>
        </ReceiptPart>

        {o === 'failed' && (
          <ReceiptPart title="What went wrong">
            <p className="text-[16px]">
              {failTitle[v.failedAt ?? 'build']}. {v.reason} Your live app stayed up.
            </p>
          </ReceiptPart>
        )}

        {gate && (
          <ReceiptPart title="Still to do">
            <ul className="flex flex-col gap-3">
              {v.missing.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-3">
                  <span className="min-w-0 flex-1 basis-56">
                    <b className="block text-[16px]">{m.name}</b>
                    <small className="block text-[14px] text-ink-2">{saved[m.id] ? `Saved as ${saved[m.id]}` : m.why}</small>
                  </span>
                  {saved[m.id] ? (
                    <Dot>Done</Dot>
                  ) : (
                    <Button variant="bordered" size="compact" onClick={() => (setDraft(''), setPanel('setting'))}>
                      Fill it in
                    </Button>
                  )}
                </li>
              ))}
              {v.flags.map((f) => (
                <li key={f.id} className="flex flex-wrap items-center gap-3">
                  <span className="min-w-0 flex-1 basis-56">
                    <b className="block text-[16px]">{f.level === 'breaking' ? 'Something will stop working' : f.level === 'security' ? 'A safety warning' : 'A check failed'}</b>
                    <small className="block text-[14px] text-ink-2">{f.text}</small>
                  </span>
                  {read.includes(f.id) ? (
                    <Dot>Read</Dot>
                  ) : (
                    <Button variant="bordered" size="compact" onClick={() => setPanel('ack')}>
                      Read it
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </ReceiptPart>
        )}

        <ReceiptPart>
          <dl className="flex flex-col gap-1.5">
            <ReceiptFact label="Does it work?" soft={!v.tests}>
              {v.tests ? <Dot tone={v.tests.failed ? 'bad' : 'ok'}>{`${v.tests.passed} checks passed${v.tests.failed ? `, ${v.tests.failed} failed` : ''}`}</Dot> : o === 'working' ? 'Not yet' : <Dot tone="quiet">Did not run</Dot>}
            </ReceiptFact>
            <ReceiptFact label="Is it safe?" soft={!v.tests}>
              {v.flags.length ? <Dot tone="warn">{`${v.flags.length} ${v.flags.length === 1 ? 'thing' : 'things'} to read first`}</Dot> : v.tests ? <Dot>Nothing risky found</Dot> : o === 'working' ? 'Not yet' : <Dot tone="quiet">Not checked</Dot>}
            </ReceiptFact>
          </dl>
        </ReceiptPart>

        <ReceiptPart title="What is in it">
          {lines.length === 0 ? (
            <p className="text-[14px] text-ink-2">Nothing changed.</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {lines.map(([g, t, w, x]) => (
                <li key={g + w + x} className="grid grid-cols-[132px_104px_1fr] items-baseline gap-x-4 text-[16px]">
                  <span className="text-[14px] text-ink-2">{g}</span>
                  <Dot tone={t}>{w}</Dot>
                  <span>{x}</span>
                </li>
              ))}
            </ul>
          )}
        </ReceiptPart>

        <ReceiptPart>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" size="compact" onClick={() => setPanel('log')}>
              Read what happened
              <ChevronRight className="size-4" aria-hidden="true" />
            </Button>
            <details className="text-[14px] text-ink-2">
              <summary className="cursor-pointer px-3 font-bold">For a developer</summary>
              <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-[14px]">
                <dt>Version</dt>
                <dd>{v.v}</dd>
                <dt>Commit</dt>
                <dd>{v.sha}</dd>
                <dt>Id</dt>
                <dd>{v.id}</dd>
              </dl>
            </details>
          </div>
        </ReceiptPart>
      </WeekReceipt>

      <nav aria-label="The versions around this one" className="mx-auto flex w-full max-w-[640px] flex-wrap justify-between gap-3 text-[14px] text-ink-2">
        <span>
          {older ? (
            <>
              Before: <Name v={older} />
            </>
          ) : (
            'Before: nothing, this was the first'
          )}
        </span>
        <span className="inline-flex items-center gap-1">
          {newer ? (
            <>
              After: <Name v={newer} />
              <ChevronRight className="size-4" aria-hidden="true" />
            </>
          ) : (
            'After: nothing yet'
          )}
        </span>
      </nav>

      {o === 'failed' && <PikkuSuggests title="Want me to fix it?" text="I can read what happened, fix the photo, and try again. Nothing goes live until you say so." yes="Fix it for me" no="Not now" />}

      {panel === 'log' && (
        <SidePanel title="What happened" sub="The record from building and publishing this version." onClose={() => setPanel(null)}>
          <pre className="overflow-auto rounded-card bg-secondary p-4 font-mono text-[13px] leading-[1.6] whitespace-pre-wrap">{v.log}</pre>
        </SidePanel>
      )}
      {panel === 'setting' && nextMissing && (
        <SidePanel title={nextMissing.name} sub={nextMissing.why} onClose={() => setPanel(null)}>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              if (draft.trim()) (setSaved((s) => ({ ...s, [nextMissing.id]: draft.trim() })), setPanel(null))
            }}
          >
            <Input shape="pill" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={nextMissing.placeholder} aria-label={nextMissing.name} className="h-12 border-[1.5px] border-input bg-card text-[16px]" />
            <div className="flex gap-3">
              <Button type="submit" variant="default" size="page" disabled={!draft.trim()}>
                Save
              </Button>
              <Button type="button" variant="bordered" size="page" onClick={() => setPanel(null)}>
                Not now
              </Button>
            </div>
          </form>
        </SidePanel>
      )}
      {panel === 'ack' && nextFlag && (
        <SidePanel title={nextFlag.level === 'breaking' ? 'Something will stop working' : 'Please read this'} sub="Publishing unlocks once you have read it." onClose={() => setPanel(null)}>
          <p className="text-[16px] text-ink-2">{nextFlag.text}</p>
          <div className="flex gap-3">
            <Button variant="default" size="page" onClick={() => (setRead((r) => [...r, nextFlag.id]), setPanel(null))}>
              I have read this
            </Button>
            <Button variant="bordered" size="page" onClick={() => setPanel(null)}>
              Not yet
            </Button>
          </div>
        </SidePanel>
      )}
      {panel === 'back' && (
        <SidePanel title="Go back to this version?" sub="What is live now is replaced. You can switch again any time." onClose={() => setPanel(null)}>
          <p className="text-[16px] text-ink-2">Your visitors get “{v.title}” within a minute. Nothing is deleted.</p>
          <div className="flex gap-3">
            <Button variant="default" size="page" onClick={() => (setPanel(null), say(`Go back to “${v.title}”`))}>
              Yes, go back
            </Button>
            <Button variant="bordered" size="page" onClick={() => setPanel(null)}>
              Keep what is live
            </Button>
          </div>
        </SidePanel>
      )}
      {panel === 'discard' && (
        <SidePanel title="Discard this version?" sub="It leaves your history. The live app is not affected." onClose={() => setPanel(null)}>
          <div className="flex gap-3">
            <Button variant="destructive" size="page" onClick={() => (setPanel(null), say(`Discard “${v.title}”`))}>
              Yes, discard
            </Button>
            <Button variant="bordered" size="page" onClick={() => setPanel(null)}>
              Keep it
            </Button>
          </div>
        </SidePanel>
      )}
    </Page>
  )
}
