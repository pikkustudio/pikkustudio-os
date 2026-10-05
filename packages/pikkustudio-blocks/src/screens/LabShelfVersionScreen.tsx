import { useContext, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, ArrowLeftRight, Check, FileText, FlaskConical, KeyRound, Settings, ShieldCheck, TriangleAlert, Workflow, Undo2 } from 'lucide-react'
import { Button, buttonVariants } from '../ui/button'
import { Input } from '../ui/input'
import { Art } from '../blocks/ExploreHub'
import { NextCard } from '../blocks/NextCard'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { PikkuSuggests } from '../blocks/PikkuSuggests'
import { Dot, RowCard, RowStack } from '../blocks/RowCard'
import { Section } from '../blocks/Section'
import { SidePanel } from '../blocks/SidePanel'
import { ShelfTile } from '../blocks/ShelfTile'
import { ShelfStrip } from '../blocks/ShelfStrip'
import { failWords, ran, shelfPart, shelfTone, shelfWords, when, who } from '../blocks/ShelfMeta'
import { versions, type Group, type Version } from '../mocks/versions'
import { keep } from '../lib/links'
import { ShellCtx } from '../lib/shell'

const sample = { url: 'https://sunrise.bakeryclasses.example' }
const groupIcon: Record<string, typeof FileText> = { Pages: FileText, Routines: Workflow, 'Secret codes': KeyRound, Settings }

const back = (
  <Link {...keep} to={'/lab/shelf' as never} className={buttonVariants({ variant: 'ghost', size: 'compact' }) + ' self-start'}>
    <ArrowLeft className="size-4" aria-hidden="true" />
    All versions
  </Link>
)

export function LabShelfVersionScreen({ id }: { id: string }) {
  const v = versions.find((x) => x.id === id)
  if (!v)
    return (
      <Page gap="snug">
        <PageHead crumb="Versions" title="We could not find that version" text="It may have been discarded." size="lead" />
        {back}
      </Page>
    )
  return <Detail v={v} />
}

const lines = (g: Group) => [...g.added.map((x) => ['ok', 'New', x] as const), ...g.changed.map((x) => ['quiet', 'Changed', x] as const), ...g.removed.map((x) => ['bad', 'Removed', x] as const)]

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
            caption={`${l.length} ${l.length === 1 ? 'change' : 'changes'}`}
            below={
              <ul className="flex flex-col gap-1.5 pl-14.5 text-[16px]">
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
    waiting: { hue: 'petrol', title: ready ? 'Ready when you are' : 'A few things first', why: ready ? 'You have done everything it needed. Nothing changes for your visitors until you press the button.' : `It is built and checked. ${left} ${left === 1 ? 'thing needs' : 'things need'} you before it can go live.` },
    working: { hue: 'teal', title: 'Publishing…', why: 'You can leave this page. Your live app is not touched until the last step.' },
    live: { hue: 'sea', title: 'This is what people see', why: `Everyone who opens your app gets this version. It has been live since ${v.liveSince?.toLowerCase()}, with ${v.visits} visitors in the last day.` },
    'was-live': { hue: 'petrol', title: 'This was live', why: 'A newer version replaced it. You can put it back whenever you like.' },
    'rolled-back': { hue: 'petrol', title: 'You went back from it', why: 'It went live, then you chose the version before it. Nothing is lost.' },
    cancelled: { hue: 'petrol', title: 'It was cancelled', why: v.reason ?? '' },
    failed: { hue: 'petrol', title: failWords[v.failedAt ?? 'build'], why: `${v.reason} Your live app stayed exactly as it was, so nobody noticed.` },
  }[o] as { hue: 'teal' | 'petrol' | 'sea'; title: string; why: string }

  // The one before it (for the live version) is not in the sample, so it is drawn as a plain slot.
  const beforeLive = o === 'live'
  const p = shelfPart(v)
  const lp = shelfPart(live)
  // What switching would undo: the changes of every newer version that actually ran.
  const newer = versions.filter((x) => ran(x.outcome) && versions.indexOf(x) < versions.indexOf(v))

  const status = (x: Version) => shelfWords[x.outcome]
  const mini = (x: Version, label: string, meta: string, flag?: boolean) => {
    const q = shelfPart(x)
    return <ShelfTile label={label} hue={q.hue} icon={q.icon} flag={flag} title={x.title} text={x.summary} status={status(x)} tone={shelfTone[x.outcome]} meta={meta} />
  }

  return (
    <Page gap="snug">
      <PageHead crumb="Versions" title={v.title} text={`${who(v)}, ${when(v).toLowerCase()}. ${v.summary}`} size="lead" />

      <NextCard label={shelfWords[o]} hue={hero.hue} art={<Art />} title={hero.title} why={hero.why}>
        {o === 'working' && <ShelfStrip phase={v.phase ?? 0} onHero />}
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
          {o !== 'working' && (
            <Button variant="heroGhost" size="page" onClick={() => setPanel('log')}>
              Read what happened
            </Button>
          )}
        </div>
      </NextCard>

      {back}

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-stretch gap-3.5" role="group" aria-label="Compare">
        {beforeLive ? (
          <ShelfTile label="Before this one" hue="grey" icon={Undo2} title="What it replaced" text="The version that was live until this one went out." status="Was live" meta={`Until ${v.liveSince?.toLowerCase()}`} />
        ) : (
          mini(live, 'What people see now', `Live since ${live.liveSince?.toLowerCase()}`)
        )}
        <span className="grid size-11 shrink-0 self-center place-items-center rounded-full border-[1.5px] border-input bg-card text-ink-2" aria-hidden="true">
          <ArrowLeftRight className="size-5" />
        </span>
        <ShelfTile label="This version" hue={p.hue} icon={p.icon} flag={gate} title={v.title} text={v.summary} status={status(v)} tone={shelfTone[o]} meta={`${who(v)} · ${when(v)}${v.took ? ` · took ${v.took}` : ''}`} />
      </div>
      {o === 'failed' && <PikkuSuggests title="Want me to fix it?" text="I can read what happened, fix the photo, and try again. Nothing goes live until you say so." yes="Fix it for me" no="Not now" />}

      {gate && (
        <Section title="Before it goes live" sub="Do these and the Publish button wakes up.">
          <RowStack>
            {v.missing.map((m) => (
              <RowCard key={m.id} flag={!saved[m.id]} tile={<Settings className="size-5" />} title={m.name} caption={saved[m.id] ?? m.why}>
                {saved[m.id] ? (
                  <Dot>Saved</Dot>
                ) : (
                  <Button variant="bordered" size="compact" onClick={() => setPanel('setting')}>
                    Fill it in
                  </Button>
                )}
              </RowCard>
            ))}
            {v.flags.map((f) => (
              <RowCard key={f.id} flag={!read.includes(f.id)} tile={<TriangleAlert className="size-5" />} title={f.level === 'breaking' ? 'Something will stop working' : f.level === 'security' ? 'A safety warning' : 'A check failed'} caption={f.text}>
                {read.includes(f.id) ? (
                  <Dot>Read</Dot>
                ) : (
                  <Button variant="bordered" size="compact" onClick={() => setRead((r) => [...r, f.id])}>
                    I have read this
                  </Button>
                )}
              </RowCard>
            ))}
          </RowStack>
        </Section>
      )}

      {(o === 'working' || o === 'waiting' || o === 'live') && (
        <Section title={o === 'live' ? 'Compared with the one before it' : 'When it goes live, this will change'}>
          <GroupRows groups={v.groups} />
        </Section>
      )}

      {(o === 'was-live' || o === 'rolled-back') && (
        <Section title="If you switched, this would change" sub="Compared with what people see now.">
          <RowStack>
            {newer.map((x) => {
              const items = x.groups.flatMap((g) => [...g.added, ...g.changed])
              const Icon = shelfPart(x).icon
              return (
                <RowCard key={x.id} tile={<Icon className="size-5" />} title={x.title} caption={`${items.join(', ')} would go back to how it was before.`}>
                  <Dot tone="warn">Would stop</Dot>
                </RowCard>
              )
            })}
            {v.groups.map((g) => {
              const Icon = groupIcon[g.label] ?? FileText
              return (
                <RowCard key={g.label} tile={<Icon className="size-5" />} title={`${g.label} in this version`} caption={[...g.added, ...g.changed].join(', ')}>
                  <Dot>Would come back</Dot>
                </RowCard>
              )
            })}
          </RowStack>
        </Section>
      )}

      {o === 'failed' && (
        <Section title="What went wrong">
          <RowStack>
            <RowCard tile={<TriangleAlert className="size-5" />} title={failWords[v.failedAt ?? 'build']} caption={v.reason}>
              <Dot tone="bad">Didn&apos;t go live</Dot>
            </RowCard>
            <RowCard on tile={<Check className="size-5" />} title="Your live app is fine" caption={`“${live.title}” is still what people see.`}>
              <Dot>Still live</Dot>
            </RowCard>
          </RowStack>
        </Section>
      )}

      {(o === 'was-live' || o === 'rolled-back' || o === 'failed' || o === 'cancelled') && (
        <Section title="What is in it" sub={o === 'failed' || o === 'cancelled' ? 'What it would have changed.' : undefined}>
          <GroupRows groups={v.groups} />
        </Section>
      )}

      {o !== 'working' && (
        <Section title="Checks">
          <RowStack>
            <RowCard tile={<FlaskConical className="size-5" />} title="Does it work?" caption={v.tests ? `${v.tests.passed} checks passed${v.tests.failed ? `, ${v.tests.failed} failed` : ''}${v.tests.skipped ? `, ${v.tests.skipped} skipped` : ''}. Took ${v.tests.secs} seconds.` : o === 'failed' ? 'The checks did not run, because it could not be built.' : 'The checks did not run.'}>
              <Dot tone={v.tests ? (v.tests.failed ? 'bad' : 'ok') : 'quiet'}>{v.tests ? (v.tests.failed ? 'Needs a look' : 'All passed') : 'Did not run'}</Dot>
            </RowCard>
            <RowCard tile={<ShieldCheck className="size-5" />} title="Is it safe?" caption={v.flags.length ? `${v.flags.length} ${v.flags.length === 1 ? 'thing' : 'things'} to read before it goes live.` : v.tests ? 'Nothing risky found.' : 'Not checked.'}>
              <Dot tone={v.flags.length ? 'warn' : v.tests ? 'ok' : 'quiet'}>{v.flags.length ? 'Read it' : v.tests ? 'Nothing found' : 'Not checked'}</Dot>
            </RowCard>
          </RowStack>
        </Section>
      )}

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

      {panel === 'log' && (
        <SidePanel title="What happened" sub="The record from building and publishing this version." onClose={() => setPanel(null)}>
          <pre className="overflow-auto rounded-card bg-secondary p-4 font-mono text-[13px] leading-[1.6] whitespace-pre-wrap">{v.log}</pre>
        </SidePanel>
      )}
      {panel === 'setting' && (
        <SidePanel title={v.missing[0]?.name ?? 'Fill it in'} sub={v.missing[0]?.why} onClose={() => setPanel(null)}>
          {v.missing.map((m) => (
            <form
              key={m.id}
              className="flex flex-col gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                if (draft[m.id]?.trim()) (setSaved((s) => ({ ...s, [m.id]: draft[m.id].trim() })), setPanel(null))
              }}
            >
              <Input shape="pill" value={draft[m.id] ?? ''} onChange={(e) => setDraft((d) => ({ ...d, [m.id]: e.target.value }))} placeholder={m.placeholder} aria-label={m.name} className="h-12 border-[1.5px] border-input bg-card text-[16px]" />
              <div className="flex gap-3">
                <Button type="submit" variant="default" size="page" disabled={!draft[m.id]?.trim()}>
                  Save
                </Button>
                <Button type="button" variant="bordered" size="page" onClick={() => setPanel(null)}>
                  Not now
                </Button>
              </div>
            </form>
          ))}
        </SidePanel>
      )}
      {panel === 'back' && (
        <SidePanel title="Go back to this version?" sub="What people see now is replaced. You can switch again any time." onClose={() => setPanel(null)}>
          <p className="text-[16px] text-ink-2">
            Your visitors get “{v.title}” within a minute. “{live.title}” goes back on the shelf. Nothing is deleted.
          </p>
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
