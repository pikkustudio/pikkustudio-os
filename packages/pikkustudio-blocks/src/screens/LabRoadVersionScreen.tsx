import { useContext, useEffect, useState, type ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowRight, Check, CircleCheck, Clock, FilePlus2, FlaskConical, Rocket, Settings, ShieldCheck, TriangleAlert, Undo2, Users, X, FileText, KeyRound, Workflow, PackageCheck } from 'lucide-react'
import { Button, buttonVariants } from '../ui/button'
import { Input } from '../ui/input'
import { Art } from '../blocks/ExploreHub'
import { NextCard } from '../blocks/NextCard'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { PikkuSuggests } from '../blocks/PikkuSuggests'
import { Dot, RowCard } from '../blocks/RowCard'
import { RoadNode, RoadStepStrip, RoadStop, type RoadNodeKind } from '../blocks/RoadSpine'
import { Section } from '../blocks/Section'
import { RowStack } from '../blocks/RowCard'
import { SidePanel } from '../blocks/SidePanel'
import { steps, versions, type Version } from '../mocks/versions'
import { keep } from '../lib/links'
import { ShellCtx } from '../lib/shell'

const sample = { url: 'https://sunrise.bakeryclasses.example' }
const failTitle = { build: 'It could not be built', start: 'It built, but would not start', publish: 'It could not be put live', data: 'Your data could not be updated' }
const groupIcon: Record<string, typeof FileText> = { Pages: FileText, Routines: Workflow, 'Secret codes': KeyRound, Settings }
const first = (n: string) => n.split(' ')[0]
const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const wentLive = (o: string) => o === 'live' || o === 'was-live' || o === 'rolled-back'

export function LabRoadVersionScreen({ id }: { id: string }) {
  const v = versions.find((x) => x.id === id)
  if (!v)
    return (
      <Page gap="snug">
        <PageHead crumb="Versions" title="We could not find that version" text="It may have been discarded." size="lead" />
        <Link {...keep} to={'/lab/road' as never} className={buttonVariants({ variant: 'default', size: 'page' }) + ' self-start'}>
          All versions
        </Link>
      </Page>
    )
  return <Detail v={v} />
}

type Moment = { key: string; kind: RoadNodeKind; icon: ReactNode; title: ReactNode; caption?: ReactNode; flag?: boolean; tail?: ReactNode; below?: ReactNode; side?: boolean; hollow?: boolean }

function Detail({ v }: { v: Version }) {
  const { say } = useContext(ShellCtx)
  const [panel, setPanel] = useState<string | null>(null) // 'log' | 'back' | 'discard' | 'set:<id>'
  const [saved, setSaved] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState('')
  const [read, setRead] = useState<string[]>([])
  const [t, setT] = useState(134)
  const o = v.outcome
  useEffect(() => {
    if (o !== 'working') return
    const i = setInterval(() => setT((x) => x + 1), 1000)
    return () => clearInterval(i)
  }, [o])

  const idx = versions.findIndex((x) => x.id === v.id)
  const before = versions[idx + 1]
  const after = versions[idx - 1]
  const prevLive = versions.slice(idx + 1).find((x) => wentLive(x.outcome))
  const nextLive = versions.slice(0, idx).reverse().find((x) => wentLive(x.outcome))
  const current = versions.find((x) => x.outcome === 'live')
  const ready = v.missing.every((m) => saved[m.id]) && v.flags.every((f) => read.includes(f.id))
  const left = v.missing.filter((m) => !saved[m.id]).length + v.flags.filter((f) => !read.includes(f.id)).length
  const link = (x: Version) => (
    <Link {...keep} to={'/lab/road/$id' as never} params={{ id: x.id } as never} className={buttonVariants({ variant: 'bordered', size: 'compact' })}>
      Open
    </Link>
  )

  const hero = {
    waiting: { hue: 'petrol', title: ready ? 'Ready when you are' : 'A few things first', why: ready ? 'You have done everything it needed. Nothing changes for your visitors until you press the button.' : `Built and checked. ${left} ${left === 1 ? 'thing is' : 'things are'} left before it can go live.` },
    working: { hue: 'teal', title: 'On its way', why: `Step ${(v.phase ?? 0) + 1} of ${steps.length}: ${steps[v.phase ?? 0][0].toLowerCase()}. Your live app is not touched until the last step, and you can leave this page.` },
    live: { hue: 'sea', title: 'You are live', why: `Everyone who opens your app gets this version. ${v.visits} people visited in the last day.` },
    'was-live': { hue: 'petrol', title: 'This was live', why: `${nextLive ? `“${nextLive.title}” replaced it.` : 'A newer version replaced it.'} You can put it back whenever you like.` },
    'rolled-back': { hue: 'petrol', title: 'You went back', why: 'It went live, then you chose the version before it. Nothing is lost.' },
    cancelled: { hue: 'petrol', title: 'It was cancelled', why: `${v.reason} Nobody saw it.` },
    failed: { hue: 'petrol', title: failTitle[v.failedAt ?? 'build'], why: `${v.reason} Your live app stayed exactly as it was, so nobody noticed.` },
  }[o] as { hue: 'teal' | 'petrol' | 'sea'; title: string; why: string }

  const m: Moment[] = []
  m.push({ key: 'saved', kind: 'past', icon: <FilePlus2 className="size-5" />, title: 'Saved', caption: `${v.by === 'GitHub' ? 'Saved from GitHub' : first(v.by)} · ${v.day.toLowerCase()} ${v.time}` })
  if (o === 'working') {
    m.push({ key: 'fetch', kind: 'past', icon: <Check className="size-5" />, title: 'Fetched your work', caption: 'Done' })
    m.push({ key: 'now', kind: 'working', icon: <Clock className="size-5" />, title: `Running for ${clock(t)}`, caption: 'Your live app is not touched until the last step.', below: <RoadStepStrip steps={steps} phase={v.phase ?? 0} /> })
    m.push({ key: 'goes', kind: 'hollow', hollow: true, icon: <Rocket className="size-5" />, title: 'Goes live', caption: 'Has not happened yet' })
  } else if (o === 'cancelled') {
    m.push({ key: 'x', kind: 'cancelled', side: true, icon: <X className="size-5" />, title: 'Cancelled', caption: v.reason })
  } else if (o === 'failed') {
    m.push({ key: 'x', kind: 'failed', side: true, icon: <TriangleAlert className="size-5" />, title: failTitle[v.failedAt ?? 'build'], caption: v.reason, tail: <Dot tone="bad">Didn't go live</Dot> })
    if (current) m.push({ key: 'stay', kind: 'live', icon: <CircleCheck className="size-5" />, title: 'Your live app stayed up', caption: `Still showing “${current.title}”`, tail: link(current) })
  } else {
    m.push({ key: 'built', kind: 'past', icon: <PackageCheck className="size-5" />, title: 'Put together and checked', caption: v.tests ? `${v.tests.passed} checks passed${v.took ? `. Took ${v.took}.` : '.'}` : v.took })
    if (o === 'waiting') {
      m.push({ key: 'wait', kind: 'waiting', flag: true, icon: <Clock className="size-5" />, title: 'Waiting for you', caption: left ? `${left} ${left === 1 ? 'thing' : 'things'} left` : 'Everything is done', tail: <Dot tone={left ? 'warn' : 'ok'}>{left ? 'Needs you' : 'Ready'}</Dot> })
      m.push({ key: 'gate', kind: 'hollow', icon: null, title: null })
      m.push({ key: 'goes', kind: 'hollow', hollow: true, icon: <Rocket className="size-5" />, title: 'Goes live', caption: 'Has not happened yet' })
    } else {
      m.push({ key: 'live', kind: 'live', icon: <Rocket className="size-5" />, title: 'Went live', caption: `${v.liveSince}${v.took ? `, took ${v.took}` : ''}` })
      if (o === 'live') {
        m.push({ key: 'vis', kind: 'past', icon: <Users className="size-5" />, title: `${v.visits} people visited in the last day`, caption: 'This is the version they see' })
        if (prevLive) m.push({ key: 'rep', kind: 'past', icon: <Undo2 className="size-5" />, title: `It replaced “${prevLive.title}”`, caption: 'You can put that one back whenever you like.', tail: link(prevLive) })
      }
      if (o === 'was-live') {
        m.push({ key: 'rep', kind: 'past', icon: <ArrowRight className="size-5" />, title: nextLive ? `Replaced by “${nextLive.title}”` : 'Replaced by a newer version', caption: nextLive ? `${nextLive.day}, ${nextLive.time}` : undefined, tail: nextLive ? link(nextLive) : undefined })
        m.push({ key: 'back', kind: 'hollow', hollow: true, icon: <Undo2 className="size-5" />, title: 'You can put it back', caption: 'Whenever you like. Nothing is deleted.' })
      }
      if (o === 'rolled-back') m.push({ key: 'rb', kind: 'back', icon: <Undo2 className="size-5" />, title: 'You went back', caption: `To ${prevLive ? `“${prevLive.title}”` : 'the version before it'}`, tail: prevLive ? link(prevLive) : undefined })
    }
  }

  const gate = o === 'waiting'
  const gateRows = (
    <>
              {v.missing.map((s) => (
                <RoadStop key={s.id} kind={saved[s.id] ? 'past' : 'waiting'} side>
                  <RowCard flag={!saved[s.id]} tile={<Settings className="size-5" />} title={s.name} caption={s.why}>
                    {saved[s.id] ? (
                      <Dot>Saved</Dot>
                    ) : (
                      <Button variant="bordered" size="compact" onClick={() => (setDraft(''), setPanel(`set:${s.id}`))}>
                        Fill it in
                      </Button>
                    )}
                  </RowCard>
                </RoadStop>
              ))}
              {v.flags.map((f) => (
                <RoadStop key={f.id} kind={read.includes(f.id) ? 'past' : 'waiting'} side>
                  <RowCard flag={!read.includes(f.id)} tile={<TriangleAlert className="size-5" />} title={f.level === 'breaking' ? 'Something will stop working' : f.level === 'security' ? 'A safety warning' : 'A check failed'} caption={f.text}>
                    {read.includes(f.id) ? (
                      <Dot>Read</Dot>
                    ) : (
                      <Button variant="bordered" size="compact" onClick={() => setRead((r) => [...r, f.id])}>
                        I have read this
                      </Button>
                    )}
                  </RowCard>
                </RoadStop>
              ))}
    </>
  )
  const settingOpen = panel?.startsWith('set:') ? v.missing.find((x) => x.id === panel.slice(4)) : undefined

  return (
    <Page gap="snug">
      <PageHead crumb="Versions" title={v.title} text={`${v.summary} ${v.by === 'GitHub' ? 'Saved from GitHub' : `Saved by ${first(v.by)}`}, ${v.day.toLowerCase()} at ${v.time}.`} size="lead" />

      <NextCard label={o} hue={hero.hue} art={<Art />} title={hero.title} why={hero.why}>
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
          {(o === 'was-live' || o === 'rolled-back') && (
            <Button variant="hero" size="page" onClick={() => setPanel('back')}>
              Go back to this version
            </Button>
          )}
          {o === 'live' && (
            <a href={sample.url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'hero', size: 'page' })}>
              Open your app
            </a>
          )}
          {o === 'cancelled' && (
            <Button variant="hero" size="page" onClick={() => say(`Try “${v.title}” again`)}>
              Publish it again
            </Button>
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
          {o !== 'working' && (
            <Button variant="heroGhost" size="page" onClick={() => setPanel('log')}>
              Read what happened
            </Button>
          )}
        </div>
      </NextCard>

      {o === 'failed' && <PikkuSuggests title="Want me to fix it?" text="I can find the missing photo, put it back and try again. Nothing goes live until you say so." yes="Fix it for me" no="Not now" />}

      <Section title="Its story" sub={o === 'working' ? 'The only thing moving is the step it is on.' : 'A still record. It does not change.'}>
        <div className="flex flex-col">
          {m.map((x, i) => x.key === 'gate' ? (
            <div key="gate">{gateRows}</div>
          ) : (
            <RoadStop key={x.key} kind={x.kind} side={x.side} first={i === 0} last={i === m.length - 1 && (x.hollow || o === 'live' || o === 'cancelled')} dashed={x.hollow}>
              <RowCard flag={x.flag} on={x.kind === 'live'} tile={x.icon} title={x.title} caption={x.caption} below={x.below}>
                {x.tail}
              </RowCard>
            </RoadStop>
          ))}
        </div>
      </Section>

      {o !== 'working' && (
        <Section title="Checks">
          <RowStack>
            <RowCard tile={<FlaskConical className="size-5" />} title="Does it work?" caption={v.tests ? `${v.tests.passed} checks passed${v.tests.failed ? `, ${v.tests.failed} failed` : ''}. Took ${v.tests.secs} seconds.` : 'The checks did not run.'}>
              <Dot tone={v.tests ? (v.tests.failed ? 'bad' : 'ok') : 'quiet'}>{v.tests ? (v.tests.failed ? 'Needs a look' : 'All passed') : 'Did not run'}</Dot>
            </RowCard>
            <RowCard tile={<ShieldCheck className="size-5" />} title="Is it safe?" caption={v.flags.length ? `${v.flags.length} ${v.flags.length === 1 ? 'thing' : 'things'} to read before it goes live.` : v.tests ? 'Nothing risky found.' : 'Not checked.'}>
              <Dot tone={v.flags.length ? 'warn' : v.tests ? 'ok' : 'quiet'}>{v.flags.length ? 'Read it' : v.tests ? 'Nothing found' : 'Not checked'}</Dot>
            </RowCard>
          </RowStack>
        </Section>
      )}

      <Section title="What is in it" sub="Compared with the version that was live before it.">
        <RowStack>
          {v.groups.map((g) => {
            const Icon = groupIcon[g.label] ?? FileText
            const lines = [...g.added.map((x) => ['ok', 'New', x] as const), ...g.changed.map((x) => ['quiet', 'Changed', x] as const), ...g.removed.map((x) => ['bad', 'Removed', x] as const)]
            return (
              <RowCard
                key={g.label}
                tile={<Icon className="size-5" />}
                title={g.label}
                caption={`${lines.length} ${lines.length === 1 ? 'change' : 'changes'}`}
                below={
                  <ul className="flex flex-col gap-1.5 pl-14.5 text-[16px]">
                    {lines.map(([tone, word, x]) => (
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
        <details className="text-[14px] text-ink-2">
          <summary className="cursor-pointer font-bold">For a developer</summary>
          <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-[14px]">
            <dt>Version</dt>
            <dd>{v.v}</dd>
            <dt>Commit</dt>
            <dd>{v.sha}</dd>
            <dt>Id</dt>
            <dd>{v.id}</dd>
          </dl>
        </details>
      </Section>

      <nav aria-label="Walk the road" className="flex flex-wrap items-center gap-3">
        <Link {...keep} to={'/lab/road' as never} className={buttonVariants({ variant: 'ghost', size: 'compact' })}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          The whole road
        </Link>
        {before && (
          <Link {...keep} to={'/lab/road/$id' as never} params={{ id: before.id } as never} className={buttonVariants({ variant: 'ghost', size: 'compact' })}>
            Before it: {before.title}
          </Link>
        )}
        {after && (
          <Link {...keep} to={'/lab/road/$id' as never} params={{ id: after.id } as never} className={buttonVariants({ variant: 'ghost', size: 'compact' })}>
            After it: {after.title}
          </Link>
        )}
      </nav>

      {panel === 'log' && (
        <SidePanel title="What happened" sub="The record from putting this version together." onClose={() => setPanel(null)}>
          <pre className="overflow-auto rounded-card bg-secondary p-4 font-mono text-[13px] leading-[1.6] whitespace-pre-wrap">{v.log}</pre>
        </SidePanel>
      )}
      {panel === 'back' && (
        <SidePanel title="Go back to this version?" sub="What is live now is replaced. You can switch again any time." onClose={() => setPanel(null)}>
          <p className="text-[16px] text-ink-2">Your visitors get “{v.title}” within a minute. Nothing is deleted.</p>
          <div className="flex gap-3">
            <Button variant="default" size="page" onClick={() => (setPanel(null), say(`Go back to “${v.title}”`))}>Yes, go back</Button>
            <Button variant="bordered" size="page" onClick={() => setPanel(null)}>Keep what is live</Button>
          </div>
        </SidePanel>
      )}
      {panel === 'discard' && (
        <SidePanel title="Discard this version?" sub="It leaves your history. The live app is not affected." onClose={() => setPanel(null)}>
          <div className="flex gap-3">
            <Button variant="destructive" size="page" onClick={() => (setPanel(null), say(`Discard “${v.title}”`))}>Yes, discard</Button>
            <Button variant="bordered" size="page" onClick={() => setPanel(null)}>Keep it</Button>
          </div>
        </SidePanel>
      )}
      {settingOpen && (
        <SidePanel title={settingOpen.name} sub={settingOpen.why} onClose={() => setPanel(null)}>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (draft.trim()) (setSaved((s) => ({ ...s, [settingOpen.id]: draft.trim() })), setPanel(null))
            }}
          >
            <Input shape="pill" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={settingOpen.placeholder} aria-label={settingOpen.name} className="h-12 border-[1.5px] border-input bg-card text-[16px]" />
            <div className="flex gap-3">
              <Button type="submit" variant="default" size="page" disabled={!draft.trim()}>Save</Button>
              <Button type="button" variant="bordered" size="page" onClick={() => setPanel(null)}>Cancel</Button>
            </div>
          </form>
        </SidePanel>
      )}
    </Page>
  )
}
