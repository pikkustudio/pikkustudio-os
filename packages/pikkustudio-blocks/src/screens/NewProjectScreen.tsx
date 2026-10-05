import { useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/input'
import { ArrowRight, Check, CircleAlert } from 'lucide-react'
import { OnbCtx } from './OnboardingLayout'
import { useImportProject, type ProjectRun } from '../lib/onboarding'


const sample = {
  ideas: [
    {
      title: "A site for my business",
      blurb: "Say who you are, what you offer and how to reach you.",
      idea: "A website for my business. It says who I am, what I offer and how to reach me.",
      cover: (
        <><rect width="200" height="200" fill="#00767E"/><circle cx="180" cy="20" r="110" fill="#0A8A92"/><circle cx="140" cy="62" r="30" fill="#FFC83D"/><path d="M50 200V120a50 50 0 0 1 100 0v80z" fill="#FFFFFF"/><path d="M72 200v-70a28 28 0 0 1 56 0v70z" fill="#00767E"/><circle cx="118" cy="168" r="4" fill="#FFC83D"/><rect x="0" y="184" width="200" height="16" fill="#005A62"/></>
      ),
    },
    {
      title: "A booking page",
      blurb: "People pick a time. You get a note. No back and forth.",
      idea: "A booking page where people can pick a time and I get a note when they do.",
      cover: (
        <><rect width="200" height="200" fill="#0B4F5C"/><circle cx="180" cy="20" r="110" fill="#14627C"/><rect x="30" y="38" width="140" height="130" rx="16" fill="#FFFFFF"/><path d="M30 54a16 16 0 0 1 16-16h108a16 16 0 0 1 16 16v16H30z" fill="#2FD3C6"/><rect x="42" y="84" width="24" height="20" rx="6" fill="#CFE3E6"/><rect x="75" y="84" width="24" height="20" rx="6" fill="#CFE3E6"/><rect x="108" y="84" width="24" height="20" rx="6" fill="#CFE3E6"/><rect x="141" y="84" width="24" height="20" rx="6" fill="#CFE3E6"/><rect x="42" y="112" width="24" height="20" rx="6" fill="#CFE3E6"/><rect x="75" y="112" width="24" height="20" rx="6" fill="#CFE3E6"/><rect x="108" y="112" width="24" height="20" rx="6" fill="#FF6F61"/><rect x="141" y="112" width="24" height="20" rx="6" fill="#CFE3E6"/><rect x="42" y="140" width="24" height="20" rx="6" fill="#CFE3E6"/><rect x="75" y="140" width="24" height="20" rx="6" fill="#CFE3E6"/><rect x="108" y="140" width="24" height="20" rx="6" fill="#CFE3E6"/><rect x="141" y="140" width="24" height="20" rx="6" fill="#CFE3E6"/></>
      ),
    },
    {
      title: "A small shop",
      blurb: "Show what you sell and take payments, simply.",
      idea: "A small shop that shows what I sell and takes payments.",
      cover: (
        <><rect width="200" height="200" fill="#FF6F61"/><circle cx="180" cy="20" r="110" fill="#FF8A7A"/><g><rect x="0" y="30" width="25" height="46" fill="#FFFFFF"/><circle cx="12" cy="76" r="12.5" fill="#FFFFFF"/><rect x="25" y="30" width="25" height="46" fill="#E5553F"/><circle cx="37" cy="76" r="12.5" fill="#E5553F"/><rect x="50" y="30" width="25" height="46" fill="#FFFFFF"/><circle cx="62" cy="76" r="12.5" fill="#FFFFFF"/><rect x="75" y="30" width="25" height="46" fill="#E5553F"/><circle cx="87" cy="76" r="12.5" fill="#E5553F"/><rect x="100" y="30" width="25" height="46" fill="#FFFFFF"/><circle cx="112" cy="76" r="12.5" fill="#FFFFFF"/><rect x="125" y="30" width="25" height="46" fill="#E5553F"/><circle cx="137" cy="76" r="12.5" fill="#E5553F"/><rect x="150" y="30" width="25" height="46" fill="#FFFFFF"/><circle cx="162" cy="76" r="12.5" fill="#FFFFFF"/><rect x="175" y="30" width="25" height="46" fill="#E5553F"/><circle cx="187" cy="76" r="12.5" fill="#E5553F"/></g><rect x="22" y="110" width="156" height="70" rx="10" fill="#FFFFFF"/><rect x="38" y="126" width="40" height="38" rx="8" fill="#FFC83D"/><rect x="88" y="126" width="40" height="38" rx="8" fill="#00767E"/><circle cx="152" cy="145" r="14" fill="#E5553F"/></>
      ),
    },
    {
      title: "A club or community hub",
      blurb: "News, events and members, all in one place.",
      idea: "A home for my club with news, events and a members list.",
      cover: (
        <><rect width="200" height="200" fill="#FFC83D"/><circle cx="180" cy="20" r="110" fill="#FFD966"/><g className="mix-blend-multiply"><circle cx="76" cy="84" r="52" fill="#2FD3C6"/><circle cx="126" cy="84" r="52" fill="#FF6F61"/><circle cx="101" cy="128" r="52" fill="#0E6B55"/></g></>
      ),
    },
    {
      title: "A tracker for my team",
      blurb: "Keep track of jobs, people or stock without a spreadsheet.",
      idea: "A tracker for my team to keep tabs on jobs and who is doing what.",
      cover: (
        <><rect width="200" height="200" fill="#0E6B55"/><circle cx="180" cy="20" r="110" fill="#138272"/><rect x="28" y="36" width="144" height="32" rx="16" fill="#E4F8F8"/><rect x="28" y="36" width="96" height="32" rx="16" fill="#FFC83D"/><rect x="28" y="84" width="144" height="32" rx="16" fill="#E4F8F8"/><rect x="28" y="84" width="60" height="32" rx="16" fill="#FF6F61"/><rect x="28" y="132" width="144" height="32" rx="16" fill="#E4F8F8"/><rect x="28" y="132" width="120" height="32" rx="16" fill="#6FE3C1"/></>
      ),
    },
    {
      title: "An app for phones",
      blurb: "Something people keep on their home screen.",
      idea: "An app people can keep on their phone’s home screen.",
      cover: (
        <><rect width="200" height="200" fill="#0C2F3C"/><circle cx="180" cy="20" r="110" fill="#14485A"/><rect x="62" y="22" width="76" height="160" rx="16" fill="#FFFFFF"/><rect x="70" y="40" width="60" height="124" rx="8" fill="#0C2F3C"/><rect x="76" y="48" width="16" height="16" rx="5" fill="#FFC83D"/><rect x="96" y="48" width="16" height="16" rx="5" fill="#FF6F61"/><rect x="116" y="48" width="16" height="16" rx="5" fill="#FFFFFF"/><rect x="76" y="70" width="16" height="16" rx="5" fill="#FF6F61"/><rect x="96" y="70" width="16" height="16" rx="5" fill="#FFFFFF"/><rect x="116" y="70" width="16" height="16" rx="5" fill="#2FD3C6"/><rect x="76" y="92" width="16" height="16" rx="5" fill="#FFFFFF"/><rect x="96" y="92" width="16" height="16" rx="5" fill="#2FD3C6"/><rect x="116" y="92" width="16" height="16" rx="5" fill="#FFC83D"/><rect x="76" y="114" width="16" height="16" rx="5" fill="#2FD3C6"/><rect x="96" y="114" width="16" height="16" rx="5" fill="#FFC83D"/><rect x="116" y="114" width="16" height="16" rx="5" fill="#FF6F61"/><rect x="88" y="26" width="24" height="5" rx="2.5" fill="#0C2F3C"/></>
      ),
    },
  ],
}

const LABELS: Record<string, string> = {
  'Make the project': 'Making your project',
  'Set up its workspace': 'Setting up your workspace',
  'Set up its database': 'Preparing where your data lives',
  'Fix what stopped it': 'Something got in the way, so I am fixing it',
  'Set up its database again': 'Trying the data setup again',
  'Start it': 'Starting it up',
  'Fix what stopped it starting': 'Fixing what stopped it starting',
  'Start it again': 'Trying to start it again',
  'Ask for a first draft': 'Sketching your first draft',
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

const h1 = 'max-w-[15ch] text-[56px] leading-[1.04] tracking-[-0.02em] group-data-open/shell:text-[46px] @min-[1700px]/app:text-[66px] group-data-open/shell:@min-[1700px]/app:text-[54px] font-bold text-balance'
const lead = 'mt-4 max-w-[52ch] text-[19px] leading-[1.55] text-hero-ink-2 @min-[1700px]/app:text-[21px] text-pretty'
const row = 'mt-1 flex flex-wrap items-center gap-x-4 gap-y-3'

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
          navigate({ to: '/overview', search: ((prev: object) => ({ ...prev, project: p.owner ? `${p.owner}/${p.slug}` : p.slug })) as never }),
      },
    )
  return (
    <section aria-label="Bring in a project">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-[26px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">Or bring in a project you already have</h2>
        <p className="text-[15px] text-muted-foreground text-pretty">Paste its git address. I will copy it here and keep it in step with where it lives.</p>
      </div>
      <form
        className="flex max-w-[720px] flex-col gap-3"
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
          <Button type="submit" variant="bordered" size="compact" disabled={!ready}>
            {bring.isPending ? 'Bringing it in…' : 'Bring it in'}
          </Button>
        </div>
        {bring.isError ? (
          <div role="alert" className="flex items-start gap-3 rounded-card border-[1.5px] border-destructive bg-card px-5 py-4">
            <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive-foreground" />
            <p className="text-[15px] text-ink-2 text-pretty">{bring.error.message}</p>
          </div>
        ) : null}
      </form>
    </section>
  )
}

export function NewProjectScreen() {
  const { st, go, retry, cancel, idea, setIdea, example, run, taken } = useContext(OnbCtx)
  const [picked, setPicked] = useState(-1)
  const hero = useRef<HTMLElement>(null)
  const loading = st === 'loading'
  const error = st === 'error'
  const empty = st === 'empty'
  const ready = idea.trim().length >= 8 && !taken

  useEffect(() => {
    if (st === 'error' && !idea.trim()) setIdea(example)
  }, [st])

  const pick = (i: number) => {
    setPicked(i)
    setIdea(sample.ideas[i].idea)
    hero.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    document.getElementById('idea')?.focus({ preventScroll: true })
  }

  return (
    <div className="mx-auto flex max-w-[1160px] flex-col gap-10 @min-[1700px]/app:max-w-[1380px]">
      <section
        ref={hero}
        data-hue="sea"
        className="relative grid min-h-95 grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] overflow-hidden rounded-[30px] bg-hero text-hero-ink group-data-open/shell:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)] @min-[1700px]/app:min-h-110"
        aria-label="Our recommendation"
      >
        <div className="relative z-1 flex flex-col justify-center gap-5 px-13 pt-13 pb-12 @min-[1700px]/app:p-16 group-data-open/shell:@min-[1700px]/app:p-13">
          {loading ? (
            <div>
              <h1 className={h1}>Sketching your first draft.</h1>
              <p className={lead}>This usually takes about two minutes. You can look around while you wait, and I will tell you the moment it is ready.</p>
            </div>
          ) : (
            <div>
              <h1 className={h1}>Say what you want to build.</h1>
              <p className={lead}>
                That is the fastest way to start. A rough sentence is enough. In a few minutes you will see a first draft, and nothing goes online until you say so.
              </p>
            </div>
          )}
          {error ? (
            <div
              role="alert"
              className="grid max-w-[620px] grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1.5 rounded-card border-[1.5px] border-destructive bg-card px-6 py-5 text-foreground"
            >
              <CircleAlert className="size-7 text-destructive-foreground" />
              <div>
                <b className="mb-0.5 block text-[17px]">I could not finish setting that up.</b>
                <p className="text-[15px] text-ink-2 text-pretty">I tried to fix it myself and could not. Your words are still here, and trying again picks up where I stopped.</p>
                {run?.error ? (
                  <details className="mt-2 text-[14px] text-ink-2">
                    <summary className="cursor-pointer font-semibold">What went wrong</summary>
                    <pre className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap text-[13px]">{run.error}</pre>
                  </details>
                ) : null}
              </div>
              <div className="col-span-full flex flex-wrap gap-2">
                <Button variant="bordered" size="compact" type="button" onClick={retry}>
                  Try again
                </Button>
              </div>
            </div>
          ) : null}
          {loading ? (
            <div>
              <ul className="flex list-none flex-col gap-3.5 text-[19px] font-semibold" role="status">
                {progress(run).map((s) => (
                  <li key={s.label} className={`flex items-center gap-3.5 ${s.state === 'wait' ? 'opacity-60' : ''}`}>
                    {s.state === 'done' ? (
                      <span className="grid size-7.5 shrink-0 place-items-center rounded-full bg-hero-ink text-hero">
                        <Check className="size-4" strokeWidth={3} />
                      </span>
                    ) : s.state === 'now' ? (
                      <span className="size-7.5 shrink-0 animate-[spin_0.9s_linear_infinite] rounded-full border-[2.5px] border-hero-ink border-r-transparent" />
                    ) : (
                      <span className="size-7.5 shrink-0 rounded-full border-2 border-dashed border-hero-ink" />
                    )}
                    {s.label}
                  </li>
                ))}
              </ul>
              <div className={`${row} mt-6`}>
                <Button variant="heroGhost" size="page" type="button" onClick={cancel}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex max-w-[600px] flex-col gap-3.5">
              <label className="sr-only" htmlFor="idea">
                What do you want to build?
              </label>
              <Textarea
                id="idea"
                tone="hero"
                value={idea}
                onChange={(e) => setIdea(e.target.value)}
                placeholder="For example: a booking page for my baking classes, where people can pick a day and pay."
              />
              <div className={row}>
                <Button variant="hero" size="pageLg" type="button" disabled={!ready} onClick={go}>
                  <span>Start building</span>
                  <ArrowRight className="size-5.5" />
                </Button>
                <span className="text-[15px] text-hero-ink-2">{taken ? `You already have a project called ${taken}. Change the first few words.` : ready ? 'Ready when you are. Nothing goes online yet.' : 'Type a sentence to begin.'}</span>
              </div>
            </div>
          )}
        </div>
        <div className="relative min-h-55 group-data-open/shell:min-h-0" aria-hidden="true">
          <svg className="absolute inset-0 size-full" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid slice">
            <circle cx="368" cy="48" r="248" className="fill-w1" />
            <circle cx="16" cy="408" r="231" className="fill-w2" />
            <circle cx="248" cy="440" r="160" className="fill-w3" opacity=".55" />
            <rect x="70" y="80" width="260" height="56" rx="28" className="fill-w6" />
            <rect x="110" y="156" width="230" height="56" rx="28" className="fill-w5" />
            <rect x="70" y="232" width="190" height="56" rx="28" className="fill-w6" opacity=".92" />
            <circle cx="330" cy="330" r="48" className="fill-coral" />
            <circle cx="330" cy="330" r="62" fill="none" className="stroke-w6" strokeWidth="3" strokeDasharray="2 10" strokeLinecap="round" />
          </svg>
        </div>
      </section>

      {loading ? null : (
        <section aria-label="Starting ideas">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-[26px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">Or begin from an idea</h2>
            {empty ? null : <p className="text-[15px] text-muted-foreground text-pretty">Pick one and I will write the first sentence for you.</p>}
          </div>
          {empty ? (
            <div className="flex items-center gap-5 rounded-empty border-2 border-dashed border-input p-7 text-ink-2">
              <span className="block size-21 shrink-0 overflow-hidden rounded-art">
                <svg viewBox="0 0 40 40" className="block size-full" aria-hidden="true">
                  <rect width="40" height="40" fill="#D5E8EB" />
                  <circle cx="34" cy="6" r="22" fill="#BCD6DA" />
                  <circle cx="20" cy="20" r="8" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="2 4" strokeLinecap="round" />
                </svg>
              </span>
              <div>
                <b className="mb-1 block font-heading text-[20px] text-foreground">No ideas to show right now.</b>
                <p className="max-w-ch56 text-[16px] text-pretty">
                  Ideas will appear here as I learn what you like to make. For now, describe it in your own words above, and I will take it from there.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-5 gap-y-6">
              {sample.ideas.map((t, i) => (
                <button
                  key={t.title}
                  type="button"
                  aria-pressed={picked === i}
                  onClick={() => pick(i)}
                  className="group -m-2.5 flex flex-col gap-3 rounded-[20px] p-2.5 text-left transition-colors duration-140 hover:bg-secondary"
                >
                  <span className="relative block aspect-square overflow-hidden rounded-[16px] shadow-lift outline-primary transition-[transform,box-shadow] duration-240 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-0.75 group-hover:shadow-deep group-active:scale-97 group-aria-pressed:outline-4 group-aria-pressed:outline-offset-3">
                    <svg viewBox="0 0 200 200" className="block size-full" aria-hidden="true">
                      {t.cover}
                    </svg>
                    <span className="absolute right-3 bottom-3 grid size-12.5 translate-y-2.5 place-items-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-[0_6px_16px_rgba(4,30,40,0.35)] transition-[opacity,transform] duration-240 ease-[cubic-bezier(.16,1,.3,1)] group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 group-aria-pressed:translate-y-0 group-aria-pressed:bg-success group-aria-pressed:opacity-100">
                      <ArrowRight className="size-5.5" />
                    </span>
                  </span>
                  <span>
                    <b className="block text-[16px] leading-[1.25]">{t.title}</b>
                    <span className="mt-0.5 block text-[14px] leading-[1.4] text-ink-2">{t.blurb}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>
      )}
      {loading ? null : <ImportProject />}
    </div>
  )
}
