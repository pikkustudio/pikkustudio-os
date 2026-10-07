import { AiSpinner } from '../blocks/Spinner'
import { useContext, useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { ArrowRight, CalendarDays, Check, Globe, ListChecks, ShoppingBag, Smartphone, Users } from 'lucide-react'
import { Page } from '../blocks/Page'
import { PageHead } from '../blocks/PageHead'
import { Hero } from '../blocks/Hero'
import { Section } from '../blocks/Section'
import { RowCard, RowStack } from '../blocks/RowCard'
import { EmptyState } from '../blocks/EmptyState'
import { InlineAlert } from '../blocks/InlineAlert'
import { StatusLine } from '../blocks/StatusLine'
import { OnbCtx } from './OnboardingLayout'
import { NewProjectForm } from './NewProjectForm'
import { useImportProject, type ProjectRun } from '../lib/onboarding'

const IDEAS = [
  { icon: Globe, title: 'A site for my business', blurb: 'Say who you are, what you offer and how to reach you.', idea: 'A website for my business. It says who I am, what I offer and how to reach me.' },
  { icon: CalendarDays, title: 'A booking page', blurb: 'People pick a time. You get a note. No back and forth.', idea: 'A booking page where people can pick a time and I get a note when they do.' },
  { icon: ShoppingBag, title: 'A small shop', blurb: 'Show what you sell and take payments, simply.', idea: 'A small shop that shows what I sell and takes payments.' },
  { icon: Users, title: 'A club or community hub', blurb: 'News, events and members, all in one place.', idea: 'A home for my club with news, events and a members list.' },
  { icon: ListChecks, title: 'A tracker for my team', blurb: 'Keep track of jobs, people or stock without a spreadsheet.', idea: 'A tracker for my team to keep tabs on jobs and who is doing what.' },
  { icon: Smartphone, title: 'An app for phones', blurb: 'Something people keep on their home screen.', idea: 'An app people can keep on their phone’s home screen.' },
]

const LABELS: Record<string, string> = {
  'Make the project': 'Making your project',
  'Look through your files': 'Reading through your files',
  'Set up its workspace': 'Setting up your workspace',
  'Set up its database': 'Preparing where your data lives',
  'Fix what stopped it': 'Something got in the way, so I am fixing it',
  'Set up its database again': 'Trying the data setup again',
  'Start it': 'Starting it up',
  'Fix what stopped it starting': 'Fixing what stopped it starting',
  'Start it again': 'Trying to start it again',
  'Ask for a first draft': 'Exploring some directions',
}
const PLAN = ['Make the project', 'Set up its workspace', 'Set up its database', 'Start it', 'Ask for a first draft']

function progress(run?: ProjectRun) {
  const seen = (run?.steps ?? []).filter((s) => LABELS[s.name])
  const names = new Set(seen.map((s) => s.name))
  const rows = [
    ...seen.map((s) => ({ label: LABELS[s.name], state: s.status === 'succeeded' ? 'done' : 'now' })),
    ...PLAN.filter((n) => !names.has(n)).map((n) => ({ label: LABELS[n], state: 'wait' })),
  ]
  if (!rows.some((r) => r.state === 'now') && run?.status !== 'completed') {
    const first = rows.findIndex((r) => r.state === 'wait')
    if (first >= 0) rows[first].state = 'now'
  }
  return rows
}

function ImportProject() {
  const navigate = useNavigate()
  const bring = useImportProject()
  const [url, setUrl] = useState('')
  const ready = url.trim().length > 3 && !bring.isPending
  const submit = () =>
    bring.mutate(
      { url: url.trim() },
      {
        onSuccess: (p) =>
          navigate({ to: '/overview', search: ((prev: object) => ({ ...prev, project: p.slug })) as never }),
      },
    )
  return (
    <Section title="Or bring in a project you already have" sub="Paste the address where it is kept. I will copy it here and keep both in step.">
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (ready) submit()
        }}
      >
        <label className="sr-only" htmlFor="import-url">
          Address of the project
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <Input
            id="import-url"
            shape="field"
            className="min-w-60 flex-1"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={bring.isPending}
            autoComplete="off"
            spellCheck={false}
            placeholder="git@github.com:your-team/your-project.git"
          />
          <Button type="submit" variant="bordered" size="page" disabled={!ready}>
            {bring.isPending ? 'Bringing it in…' : 'Bring it in'}
          </Button>
        </div>
        {bring.isError ? <StatusLine tone="bad" text={bring.error.message} /> : null}
      </form>
    </Section>
  )
}

export function NewProjectScreen() {
  const { st, go, retry, cancel, idea, setIdea, example, run, uses, setUses, files, setFiles } = useContext(OnbCtx)
  const loading = st === 'loading'
  const error = st === 'error'
  const navigate = useNavigate()
  const needsAi = /Choose your AI/.test(run?.error ?? '')
  const empty = st === 'empty'
  const ready = idea.trim().length >= 8 && uses.devices.length > 0

  useEffect(() => {
    if (st === 'error' && !idea.trim()) setIdea(example)
  }, [st])

  const pick = (text: string) => {
    setIdea(text)
    document.getElementById('idea')?.focus()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (loading)
    return (
      <Page>
        <Hero
          hue="sea"
          art="bars"
          title="Exploring some directions."
          why="This usually takes about two minutes. You can look around while you wait, and I will tell you the moment it is ready."
          actions={
            <Button variant="heroGhost" size="page" type="button" onClick={cancel}>
              Cancel
            </Button>
          }
        >
          <ul className="flex list-none flex-col gap-3 text-px17 font-semibold" role="status">
            {progress(run).map((s) => (
              <li key={s.label} className={`flex items-center gap-3 ${s.state === 'wait' ? 'opacity-60' : ''}`}>
                {s.state === 'done' ? (
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-hero-ink text-hero">
                    <Check className="size-4" strokeWidth={3} />
                  </span>
                ) : s.state === 'now' && s.label === LABELS['Ask for a first draft'] ? (
                  <span className="grid size-7 shrink-0 place-items-center text-hero-ink">
                    <AiSpinner className="size-7" />
                  </span>
                ) : s.state === 'now' ? (
                  <span className="size-7 shrink-0 animate-[spin_0.9s_linear_infinite] rounded-full border-[2.5px] border-hero-ink border-r-transparent" />
                ) : (
                  <span className="size-7 shrink-0 rounded-full border-2 border-dashed border-hero-ink" />
                )}
                {s.label}
              </li>
            ))}
          </ul>
        </Hero>
      </Page>
    )

  return (
    <Page>
      <PageHead
        crumb="Projects"
        title="Start a project"
        text="Tell me what you want to make, in your own words. I will set it up and show you a first draft. It is yours and your team's to shape from there."
        size="lead"
      />
      {error ? (
        <InlineAlert
          title={needsAi ? 'I need an AI to explore directions.' : 'I could not finish setting that up.'}
          body={
            needsAi
              ? 'Your project is made, but no AI is chosen yet. Choose one, then try again. Your words are still here.'
              : 'I tried to fix it myself and could not. Your words are still here, and trying again picks up where I stopped.'
          }
          action={
            <>
              {needsAi ? (
                <Button size="compact" type="button" onClick={() => navigate({ to: '/choose-ai', search: ((prev: object) => ({ ...prev, run: undefined })) as never })}>
                  Choose your AI
                </Button>
              ) : null}
              <Button variant="bordered" size="compact" type="button" onClick={retry}>
                Try again
              </Button>
            </>
          }
        />
      ) : null}
      <NewProjectForm idea={idea} setIdea={setIdea} example={example} uses={uses} setUses={setUses} files={files} setFiles={setFiles} ready={ready} go={go} />

      <Section title="Or begin from an idea" sub={empty ? undefined : 'Pick one and I will write the first sentence for you.'}>
        {empty ? (
          <EmptyState layout="row" title="No ideas to show right now." text="Describe what you want to make in your own words above, and I will take it from there." />
        ) : (
          <RowStack>
            {IDEAS.map((t) => (
              <RowCard key={t.title} tile={<t.icon className="size-5" />} title={t.title} caption={t.blurb}>
                <Button variant="ghost" size="compact" type="button" onClick={() => pick(t.idea)}>
                  Use this idea
                  <ArrowRight className="size-4" />
                </Button>
              </RowCard>
            ))}
          </RowStack>
        )}
      </Section>
      <ImportProject />
    </Page>
  )
}
