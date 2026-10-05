import { useContext, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Check, FlaskConical, ShieldCheck } from 'lucide-react'
import { Button, buttonVariants } from '../ui/button'
import { Input } from '../ui/input'
import { Art } from '../blocks/ExploreHub'
import { NextCard } from '../blocks/NextCard'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { PartCard, deriveParts, type Part } from '../blocks/PartCard'
import { PartSteps } from '../blocks/PartSteps'
import { PikkuSuggests } from '../blocks/PikkuSuggests'
import { Dot, RowCard, RowStack } from '../blocks/RowCard'
import { Section } from '../blocks/Section'
import { SidePanel } from '../blocks/SidePanel'
import { versions, type Outcome, type Version } from '../mocks/versions'
import { keep } from '../lib/links'
import { ShellCtx } from '../lib/shell'

const sample = {
  url: 'https://sunrise.bakeryclasses.example',
  // Which part a warning or a failure belongs to, in plain words. Warnings and failures are not tied to a part in the data.
  flagPart: { f1: 'Book a class' } as Record<string, string>,
  failPart: { v6: 'Classes' } as Record<string, string>,
}

const outcomeLabel: Record<Outcome, string> = { live: 'Live', 'was-live': 'Was live', failed: "Didn't go live", 'rolled-back': 'Went back from it', cancelled: 'Cancelled', working: 'Publishing', waiting: 'Waiting for you' }
const failTitle = { build: 'It could not be built', start: 'It built, but would not start', publish: 'It could not be put live', data: 'Your data could not be updated' }
const when = (v: Version) => (v.outcome === 'live' ? `Live since ${v.liveSince}.` : v.outcome === 'working' ? `Started ${v.started}.` : `${v.day}, ${v.time}.`)
const doWord = { New: 'Will add this', Changed: 'Will change this', Removed: 'Will remove this' }
const doneWord = { New: 'Added', Changed: 'Changed', Removed: 'Removed' }
const tone = { New: 'ok', Changed: 'quiet', Removed: 'bad' } as const

type PanelKind = { k: 'log' | 'back' | 'discard' } | { k: 'setting'; id: string }

export function LabPartVersionScreen({ id }: { id: string }) {
  const v = versions.find((x) => x.id === id)
  if (!v)
    return (
      <Page gap="snug">
        <PageHead crumb="Versions" title="We could not find that version" text="It may have been discarded." size="lead" />
        <Link {...keep} to={'/lab/part' as never} className={buttonVariants({ variant: 'default', size: 'page' }) + ' self-start'}>
          All versions
        </Link>
      </Page>
    )
  return <Detail v={v} />
}

function Detail({ v }: { v: Version }) {
  const { say } = useContext(ShellCtx)
  const [panel, setPanel] = useState<PanelKind | null>(null)
  const [saved, setSaved] = useState<Record<string, string>>({})
  const [draft, setDraft] = useState('')
  const [read, setRead] = useState<string[]>([])
  const o = v.outcome
  const gate = o === 'waiting'
  const parts = useMemo(() => deriveParts().filter((p) => p.touches.some((t) => t.v.id === v.id)), [v.id])
  const left = v.missing.filter((m) => !saved[m.id]).length + v.flags.filter((f) => !read.includes(f.id)).length
  const ready = left === 0
  const failedName = sample.failPart[v.id] ?? parts[0]?.name
  const flagFor = (p: Part) => v.flags.filter((f) => (sample.flagPart[f.id] ?? parts[0]?.name) === p.name)
  const missingFor = (p: Part) => v.missing.filter((m) => m.name === p.name)

  const hero = {
    waiting: { hue: 'petrol', title: ready ? 'Ready when you are' : 'A few things first', why: ready ? 'Every part is sorted. Nothing changes for your visitors until you press the button.' : `It is built and checked. ${left} ${left === 1 ? 'part needs' : 'parts need'} you before it can go live.` },
    working: { hue: 'teal', title: 'Publishing…', why: `Your live app is not touched until the last step, and you can leave this page. These parts change when it goes live.` },
    live: { hue: 'sea', title: 'This is what people see', why: `Everyone who opens your app gets this version. It has been live since ${v.liveSince?.toLowerCase()}, with ${v.visits} visitors in the last day.` },
    'was-live': { hue: 'petrol', title: 'This was live', why: `A newer version replaced it. ${v.replaces ? `It had replaced ${v.replaces.toLowerCase()}.` : ''} You can put it back whenever you like.` },
    'rolled-back': { hue: 'petrol', title: 'You went back from it', why: 'It went live, then you chose the version before it. Nothing is lost.' },
    cancelled: { hue: 'petrol', title: 'It was cancelled', why: v.reason ?? '' },
    failed: { hue: 'petrol', title: failTitle[v.failedAt ?? 'build'], why: `${v.reason} Your live app stayed exactly as it was, so nobody noticed.` },
  }[o] as { hue: 'teal' | 'petrol' | 'sea'; title: string; why: string }

  const stepState = o === 'working' ? 'working' : o === 'waiting' ? 'stopped' : o === 'failed' ? 'failed' : o === 'cancelled' ? null : 'done'
  const failStep = { build: 1, start: 2, publish: 4, data: 4 }[v.failedAt ?? 'build']
  const noun = (n: number) => `${n} ${n === 1 ? 'part' : 'parts'}`

  return (
    <Page gap="snug">
      <PageHead crumb="Versions" title={v.title} text={`${when(v)} ${v.summary}`} size="lead" />

      <NextCard label={outcomeLabel[o]} hue={hero.hue} art={<Art />} title={hero.title} why={hero.why}>
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
            <Button variant="hero" size="page" onClick={() => setPanel({ k: 'back' })}>
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
            <Button variant="heroGhost" size="page" onClick={() => setPanel({ k: 'discard' })}>
              Discard
            </Button>
          )}
          {o !== 'working' && (
            <Button variant="heroGhost" size="page" onClick={() => setPanel({ k: 'log' })}>
              Read what happened
            </Button>
          )}
        </div>
      </NextCard>

      <Link {...keep} to={'/lab/part' as never} className={buttonVariants({ variant: 'ghost', size: 'compact' }) + ' self-start'}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        All versions
      </Link>

      {stepState && <PartSteps phase={v.phase ?? 0} state={stepState} failedAt={failStep} />}

      {o === 'failed' && <PikkuSuggests title="Want me to fix it?" text="I can read what happened, fix the photo, and try again. Nothing goes live until you say so." yes="Fix it for me" no="Not now" />}

      <Section title="What it changes, part by part" sub={`${noun(parts.length)}, compared with the version that was live before it.`}>
        <RowStack>
          {parts.map((p) => {
            const t = p.touches.find((x) => x.v.id === v.id)!
            const miss = missingFor(p)
            const flags = flagFor(p)
            const broke = o === 'failed' && p.name === failedName
            const open = gate && (miss.some((m) => !saved[m.id]) || flags.some((f) => !read.includes(f.id)))
            const sorted = gate && !open && (miss.length > 0 || flags.length > 0)
            const caption =
              broke
                ? v.reason
                : miss.length
                  ? saved[miss[0].id]
                    ? `Sender address saved: ${saved[miss[0].id]}`
                    : miss[0].why
                  : flags.length
                    ? flags[0].text
                    : gate
                      ? `${doWord[t.word]} when it goes live.`
                      : o === 'working'
                        ? 'Will change when it goes live.'
                        : o === 'failed' || o === 'cancelled'
                          ? 'Not put live.'
                          : o === 'live'
                            ? `${doneWord[t.word]} ${v.liveSince?.toLowerCase()}.`
                            : `${doneWord[t.word]} ${v.day.toLowerCase()}, ${v.time}.`
            const status = broke ? <Dot tone="bad">Could not be built</Dot> : open ? <Dot tone="warn">Needs you</Dot> : sorted ? <Dot>Sorted</Dot> : gate ? <Dot>Fine</Dot> : null
            return (
              <PartCard key={p.name} part={{ ...p, touches: p.touches.filter((x) => x.v.outcome !== 'cancelled' || x.v.id === v.id) }} flag={open} status={<span className="inline-flex items-center gap-3"><Dot tone={t.word === 'Removed' ? 'bad' : tone[t.word]}>{t.word}</Dot>{status}</span>} caption={caption} note={o === 'live' || o === 'was-live' ? `${p.kind === 'Pages' ? 'A page' : p.kind === 'Routines' ? 'A routine' : p.kind === 'Settings' ? 'A setting' : 'A secret code'}` : undefined}>
                {gate && miss.filter((m) => !saved[m.id]).map((m) => (
                  <Button key={m.id} variant="bordered" size="compact" onClick={() => (setDraft(''), setPanel({ k: 'setting', id: m.id }))}>
                    Add the address
                  </Button>
                ))}
                {gate && flags.filter((f) => !read.includes(f.id)).map((f) => (
                  <Button key={f.id} variant="bordered" size="compact" onClick={() => setRead((r) => [...r, f.id])}>
                    I have read this
                  </Button>
                ))}
              </PartCard>
            )
          })}
        </RowStack>
      </Section>

      {o !== 'working' && (
        <Section title="Things to know">
          <RowStack>
            <RowCard
              tile={<FlaskConical className="size-5" />}
              title="Does it work?"
              caption={v.tests ? `${v.tests.passed} checks passed${v.tests.failed ? `, ${v.tests.failed} failed` : ''}${v.tests.skipped ? `, ${v.tests.skipped} skipped` : ''}. Took ${v.tests.secs} seconds.` : o === 'failed' ? 'The checks did not run, because it could not be built.' : 'The checks did not run.'}
            >
              <Dot tone={v.tests ? (v.tests.failed ? 'bad' : 'ok') : 'quiet'}>{v.tests ? (v.tests.failed ? 'Needs a look' : 'All passed') : 'Did not run'}</Dot>
            </RowCard>
            <RowCard tile={<ShieldCheck className="size-5" />} title="Is it safe?" caption={v.flags.length ? `${v.flags.length} ${v.flags.length === 1 ? 'thing' : 'things'} to read, shown on the part it is about.` : v.tests ? 'Nothing risky found.' : 'Not checked.'}>
              <Dot tone={v.flags.length ? 'warn' : v.tests ? 'ok' : 'quiet'}>{v.flags.length ? 'Read it' : v.tests ? 'Nothing found' : 'Not checked'}</Dot>
            </RowCard>
            {o === 'failed' && (
              <RowCard tile={<Check className="size-5" />} on title="Your live app stayed up" caption="Nothing your visitors see was changed.">
                <Dot>Safe</Dot>
              </RowCard>
            )}
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
      )}

      {panel?.k === 'setting' && (
        <SidePanel title="Waiting-list sender address" sub="The address the “a seat opened” email comes from." onClose={() => setPanel(null)}>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (draft.trim()) (setSaved((s) => ({ ...s, [panel.id]: draft.trim() })), setPanel(null))
            }}
          >
            <Input shape="pill" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={v.missing.find((m) => m.id === panel.id)?.placeholder} aria-label="Sender address" className="h-12 border-[1.5px] border-input bg-card text-[16px]" />
            <div className="flex gap-3">
              <Button type="submit" variant="default" size="page" disabled={!draft.trim()}>
                Save
              </Button>
              <Button type="button" variant="bordered" size="page" onClick={() => setPanel(null)}>
                Cancel
              </Button>
            </div>
          </form>
        </SidePanel>
      )}
      {panel?.k === 'log' && (
        <SidePanel title="What happened" sub="The record from building and publishing this version." onClose={() => setPanel(null)}>
          <pre className="overflow-auto rounded-card bg-secondary p-4 font-mono text-[13px] leading-[1.6] whitespace-pre-wrap">{v.log}</pre>
        </SidePanel>
      )}
      {panel?.k === 'back' && (
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
      {panel?.k === 'discard' && (
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

