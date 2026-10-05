import { useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Check, Clock, LoaderCircle, Search, TriangleAlert, Undo2, X } from 'lucide-react'
import { Button, buttonVariants } from '../ui/button'
import { Input } from '../ui/input'
import { Art } from '../blocks/ExploreHub'
import { NextCard } from '../blocks/NextCard'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { Dot, RowCard, RowStack } from '../blocks/RowCard'
import { PartCard, deriveParts, pipTone, pipWord, type Part } from '../blocks/PartCard'
import { Section } from '../blocks/Section'
import { Segmented } from '../blocks/Segmented'
import { SidePanel } from '../blocks/SidePanel'
import { versions, type Outcome } from '../mocks/versions'
import { keep } from '../lib/links'

const sample = { app: 'Sunrise Bakery Classes', url: 'https://sunrise.bakeryclasses.example' }

const label: Record<Outcome, string> = { live: 'Live', 'was-live': 'Was live', failed: "Didn't go live", 'rolled-back': 'Went back from it', cancelled: 'Cancelled', working: 'Publishing', waiting: 'Waiting for you' }
const tone: Record<Outcome, 'ok' | 'warn' | 'bad' | 'quiet'> = { live: 'ok', 'was-live': 'quiet', failed: 'bad', 'rolled-back': 'quiet', cancelled: 'quiet', working: 'ok', waiting: 'warn' }
const Tile = ({ o }: { o: Outcome }) => {
  const I = { live: Check, 'was-live': Clock, failed: TriangleAlert, 'rolled-back': Undo2, cancelled: X, working: LoaderCircle, waiting: Clock }[o]
  return <I className={o === 'working' ? 'size-5 animate-spin' : 'size-5'} />
}
const who = (by: string) => (by === 'GitHub' ? 'saved from GitHub' : `by ${by}`)

export function LabPartListScreen() {
  const [mode, setMode] = useState('part')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState<Part | null>(null)
  const parts = useMemo(() => deriveParts(), [])
  const waiting = versions.find((v) => v.outcome === 'waiting')
  const working = versions.find((v) => v.outcome === 'working')
  const term = q.trim().toLowerCase()
  const shownParts = parts.filter((p) => !term || p.name.toLowerCase().includes(term) || p.touches.some((t) => t.v.title.toLowerCase().includes(term)))
  const needs = shownParts.filter((p) => p.touches.some((t) => t.v.outcome === 'waiting'))
  const rest = shownParts.filter((p) => !needs.includes(p))
  const shownVersions = versions.filter((v) => !term || v.title.toLowerCase().includes(term))
  const waitingParts = waiting ? parts.filter((p) => p.touches.some((t) => t.v.id === waiting.id)).length : 0

  return (
    <Page gap="snug">
      <PageHead crumb={sample.app} title="Versions" text="Your app part by part, and the versions that touched each one." size="lead">
        <Button variant="bordered" size="page" className="self-start">
          Publish a version
        </Button>
      </PageHead>

      <NextCard
        label="What matters now"
        hue="teal"
        art={<Art />}
        title={waiting ? 'One needs you' : working ? 'One is on its way' : 'Your app is live'}
        why={waiting ? `“${waiting.title}” changes ${waitingParts} parts of your app. One of them needs a setting from you, and nothing changes for your visitors until you say so.` : working ? `“${working.title}” is being put together.` : 'Everything is up to date.'}
      >
        <div className="flex flex-wrap gap-3">
          {waiting || working ? (
            <Link {...keep} to={'/lab/part/$id' as never} params={{ id: (waiting ?? working)!.id } as never} className={buttonVariants({ variant: 'hero', size: 'page' })}>
              {waiting ? 'Review it' : 'Follow it'}
            </Link>
          ) : null}
          <a href={sample.url} target="_blank" rel="noreferrer" className={buttonVariants({ variant: 'heroGhost', size: 'page' })}>
            Open your app
          </a>
        </div>
      </NextCard>

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="How to look"
          value={mode}
          options={[
            ['part', 'By part'],
            ['time', 'By time'],
          ]}
          onChange={setMode}
        />
        <span className="relative min-w-0 flex-1 basis-56">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-4.5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input shape="pill" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a part or a version" aria-label="Find a part or a version" className="h-12 border-[1.5px] border-input bg-card pl-11 text-[16px]" />
        </span>
      </div>

      {mode === 'part' ? (
        <>
          {needs.length > 0 && (
            <Section title="Parts with something waiting" sub={`“${waiting?.title}” will change these once you publish it.`}>
              <RowStack>
                {needs.map((p) => {
                  const t = p.touches.find((x) => x.v.outcome === 'waiting')!
                  return (
                    <PartCard
                      key={p.name}
                      part={p}
                      flag
                      status={<Dot tone="warn">Waiting for you</Dot>}
                      caption={`“${t.v.title}” (${t.v.by}, ${t.v.day.toLowerCase()} ${t.v.time}) will ${t.word === 'New' ? 'add' : t.word === 'Removed' ? 'remove' : 'change'} this.`}
                    >
                      <Link {...keep} to={'/lab/part/$id' as never} params={{ id: t.v.id } as never} className={buttonVariants({ variant: 'bordered', size: 'compact' })}>
                        Review
                      </Link>
                    </PartCard>
                  )
                })}
              </RowStack>
            </Section>
          )}
          <Section title={needs.length ? 'Everything else' : 'Your parts'}>
            {rest.length === 0 ? <p className="text-[14px] text-ink-2">No part matches.</p> : null}
            <RowStack>
              {rest.map((p) => {
                const t = p.touches[0]
                const o = t.v.outcome
                const caption =
                  o === 'working' ? `“${t.v.title}” is being put live now.` : o === 'failed' ? `“${t.v.title}” could not go live ${t.v.day.toLowerCase()}. What people see is unchanged.` : o === 'rolled-back' ? `Last changed ${t.v.day.toLowerCase()} by “${t.v.title}”, which you went back from.` : `Last changed ${t.v.day.toLowerCase()}, ${t.v.time} by “${t.v.title}” (${who(t.v.by)}).`
                return (
                  <PartCard key={p.name} part={p} status={<Dot tone={o === 'failed' ? 'bad' : o === 'working' || o === 'live' ? 'ok' : 'quiet'}>{o === 'working' ? 'Publishing now' : o === 'failed' ? "A try didn't go live" : o === 'live' ? 'Live' : 'In your app'}</Dot>}>
                    <Button variant="ghost" size="compact" onClick={() => setOpen(p)}>
                      History
                    </Button>
                  </PartCard>
                )
              })}
            </RowStack>
          </Section>
        </>
      ) : (
        <Section title="All versions" sub="Newest first.">
          {shownVersions.length === 0 ? <p className="text-[14px] text-ink-2">No version matches.</p> : null}
          <RowStack>
            {shownVersions.map((v) => (
              <RowCard key={v.id} flag={v.outcome === 'waiting'} on={v.outcome === 'live'} tile={<Tile o={v.outcome} />} title={v.title} caption={`${v.day}, ${v.time} · ${v.by === 'GitHub' ? 'Saved from GitHub' : `By ${v.by}`}`} note={v.reason}>
                <Dot tone={tone[v.outcome]}>{label[v.outcome]}</Dot>
                <Link {...keep} to={'/lab/part/$id' as never} params={{ id: v.id } as never} className={buttonVariants({ variant: 'bordered', size: 'compact' })}>
                  Open
                </Link>
              </RowCard>
            ))}
          </RowStack>
        </Section>
      )}

      {open && (
        <SidePanel title={open.name} sub="Every version that touched this part, newest first." onClose={() => setOpen(null)}>
          <RowStack>
            {open.touches.map((t) => (
              <RowCard key={t.v.id} tile={<i className={`size-3 rounded-full ${pipTone(t.v.outcome)}`} />} title={t.v.title} caption={`${t.word === 'New' ? 'Added' : t.word}, ${t.v.day.toLowerCase()} ${t.v.time}. ${label[t.v.outcome]}.`}>
                <Link {...keep} to={'/lab/part/$id' as never} params={{ id: t.v.id } as never} className={buttonVariants({ variant: 'bordered', size: 'compact' })} aria-label={`Open ${t.v.title} (${pipWord(t.v.outcome)})`}>
                  Open
                </Link>
              </RowCard>
            ))}
          </RowStack>
        </SidePanel>
      )}
    </Page>
  )
}
