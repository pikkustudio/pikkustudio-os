import { asI18n, type I18nString } from '@pikku/react'
import { MachineOpening, OpeningStage } from '../blocks/MachineOpening'
import { EmptyState } from '../blocks/EmptyState'
import { useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { ArrowRight, ChevronRight, CircleAlert, FileSpreadsheet, FolderOpen, Globe, GitBranch, Lightbulb, MessageCircle, Sparkles, Wand2, type LucideIcon } from 'lucide-react'
import { OnbCtx } from './OnboardingLayout'
import { ShellCtx } from '../lib/shell'
import { NewProjectForm } from './NewProjectForm'
import { m } from '@/i18n/messages'
import { type ProjectRun } from '../lib/onboarding'


const sample = () => ({
  ideas: [
    {
      title: m.new_project_screen__idea1_title(),
      blurb: m.new_project_screen__idea1_blurb(),
      idea: m.new_project_screen__idea1_text(),
      cover: (
        <><rect width="200" height="200" fill="#00767E"/><circle cx="180" cy="20" r="110" fill="#0A8A92"/><circle cx="140" cy="62" r="30" fill="#FFC83D"/><path d="M50 200V120a50 50 0 0 1 100 0v80z" fill="#FFFFFF"/><path d="M72 200v-70a28 28 0 0 1 56 0v70z" fill="#00767E"/><circle cx="118" cy="168" r="4" fill="#FFC83D"/><rect x="0" y="184" width="200" height="16" fill="#005A62"/></>
      ),
    },
    {
      title: m.new_project_screen__idea2_title(),
      blurb: m.new_project_screen__idea2_blurb(),
      idea: m.new_project_screen__idea2_text(),
      cover: (
        <><rect width="200" height="200" fill="#0B4F5C"/><circle cx="180" cy="20" r="110" fill="#14627C"/><rect x="30" y="38" width="140" height="130" rx="16" fill="#FFFFFF"/><path d="M30 54a16 16 0 0 1 16-16h108a16 16 0 0 1 16 16v16H30z" fill="#2FD3C6"/><rect x="42" y="84" width="24" height="20" rx="6" fill="#CFE3E6"/><rect x="75" y="84" width="24" height="20" rx="6" fill="#CFE3E6"/><rect x="108" y="84" width="24" height="20" rx="6" fill="#CFE3E6"/><rect x="141" y="84" width="24" height="20" rx="6" fill="#CFE3E6"/><rect x="42" y="112" width="24" height="20" rx="6" fill="#CFE3E6"/><rect x="75" y="112" width="24" height="20" rx="6" fill="#CFE3E6"/><rect x="108" y="112" width="24" height="20" rx="6" fill="#FF6F61"/><rect x="141" y="112" width="24" height="20" rx="6" fill="#CFE3E6"/><rect x="42" y="140" width="24" height="20" rx="6" fill="#CFE3E6"/><rect x="75" y="140" width="24" height="20" rx="6" fill="#CFE3E6"/><rect x="108" y="140" width="24" height="20" rx="6" fill="#CFE3E6"/><rect x="141" y="140" width="24" height="20" rx="6" fill="#CFE3E6"/></>
      ),
    },
    {
      title: m.new_project_screen__idea3_title(),
      blurb: m.new_project_screen__idea3_blurb(),
      idea: m.new_project_screen__idea3_text(),
      cover: (
        <><rect width="200" height="200" fill="#FF6F61"/><circle cx="180" cy="20" r="110" fill="#FF8A7A"/><g><rect x="0" y="30" width="25" height="46" fill="#FFFFFF"/><circle cx="12" cy="76" r="12.5" fill="#FFFFFF"/><rect x="25" y="30" width="25" height="46" fill="#E5553F"/><circle cx="37" cy="76" r="12.5" fill="#E5553F"/><rect x="50" y="30" width="25" height="46" fill="#FFFFFF"/><circle cx="62" cy="76" r="12.5" fill="#FFFFFF"/><rect x="75" y="30" width="25" height="46" fill="#E5553F"/><circle cx="87" cy="76" r="12.5" fill="#E5553F"/><rect x="100" y="30" width="25" height="46" fill="#FFFFFF"/><circle cx="112" cy="76" r="12.5" fill="#FFFFFF"/><rect x="125" y="30" width="25" height="46" fill="#E5553F"/><circle cx="137" cy="76" r="12.5" fill="#E5553F"/><rect x="150" y="30" width="25" height="46" fill="#FFFFFF"/><circle cx="162" cy="76" r="12.5" fill="#FFFFFF"/><rect x="175" y="30" width="25" height="46" fill="#E5553F"/><circle cx="187" cy="76" r="12.5" fill="#E5553F"/></g><rect x="22" y="110" width="156" height="70" rx="10" fill="#FFFFFF"/><rect x="38" y="126" width="40" height="38" rx="8" fill="#FFC83D"/><rect x="88" y="126" width="40" height="38" rx="8" fill="#00767E"/><circle cx="152" cy="145" r="14" fill="#E5553F"/></>
      ),
    },
    {
      title: m.new_project_screen__idea4_title(),
      blurb: m.new_project_screen__idea4_blurb(),
      idea: m.new_project_screen__idea4_text(),
      cover: (
        <><rect width="200" height="200" fill="#FFC83D"/><circle cx="180" cy="20" r="110" fill="#FFD966"/><g className="mix-blend-multiply"><circle cx="76" cy="84" r="52" fill="#2FD3C6"/><circle cx="126" cy="84" r="52" fill="#FF6F61"/><circle cx="101" cy="128" r="52" fill="#0E6B55"/></g></>
      ),
    },
    {
      title: m.new_project_screen__idea5_title(),
      blurb: m.new_project_screen__idea5_blurb(),
      idea: m.new_project_screen__idea5_text(),
      cover: (
        <><rect width="200" height="200" fill="#0E6B55"/><circle cx="180" cy="20" r="110" fill="#138272"/><rect x="28" y="36" width="144" height="32" rx="16" fill="#E4F8F8"/><rect x="28" y="36" width="96" height="32" rx="16" fill="#FFC83D"/><rect x="28" y="84" width="144" height="32" rx="16" fill="#E4F8F8"/><rect x="28" y="84" width="60" height="32" rx="16" fill="#FF6F61"/><rect x="28" y="132" width="144" height="32" rx="16" fill="#E4F8F8"/><rect x="28" y="132" width="120" height="32" rx="16" fill="#6FE3C1"/></>
      ),
    },
    {
      title: m.new_project_screen__idea6_title(),
      blurb: m.new_project_screen__idea6_blurb(),
      idea: m.new_project_screen__idea6_text(),
      cover: (
        <><rect width="200" height="200" fill="#0C2F3C"/><circle cx="180" cy="20" r="110" fill="#14485A"/><rect x="62" y="22" width="76" height="160" rx="16" fill="#FFFFFF"/><rect x="70" y="40" width="60" height="124" rx="8" fill="#0C2F3C"/><rect x="76" y="48" width="16" height="16" rx="5" fill="#FFC83D"/><rect x="96" y="48" width="16" height="16" rx="5" fill="#FF6F61"/><rect x="116" y="48" width="16" height="16" rx="5" fill="#FFFFFF"/><rect x="76" y="70" width="16" height="16" rx="5" fill="#FF6F61"/><rect x="96" y="70" width="16" height="16" rx="5" fill="#FFFFFF"/><rect x="116" y="70" width="16" height="16" rx="5" fill="#2FD3C6"/><rect x="76" y="92" width="16" height="16" rx="5" fill="#FFFFFF"/><rect x="96" y="92" width="16" height="16" rx="5" fill="#2FD3C6"/><rect x="116" y="92" width="16" height="16" rx="5" fill="#FFC83D"/><rect x="76" y="114" width="16" height="16" rx="5" fill="#2FD3C6"/><rect x="96" y="114" width="16" height="16" rx="5" fill="#FFC83D"/><rect x="116" y="114" width="16" height="16" rx="5" fill="#FF6F61"/><rect x="88" y="26" width="24" height="5" rx="2.5" fill="#0C2F3C"/></>
      ),
    },
  ],
})

/** What each step of making the project is called while it runs; a function so the words follow the language. */
const labels = (): Record<string, I18nString> => ({
  'Make the project': m.new_project_screen__step_make_the_project(),
  'Look through your files': m.new_project_screen__step_look_through_your_files(),
  'Set up its workspace': m.new_project_screen__step_set_up_its_workspace(),
  'Set up its database': m.new_project_screen__step_set_up_its_database(),
  'Fix what stopped it': m.new_project_screen__step_fix_what_stopped_it(),
  'Set up its database again': m.new_project_screen__step_set_up_its_database_again(),
  'Start it': m.new_project_screen__step_start_it(),
  'Fix what stopped it starting': m.new_project_screen__step_fix_what_stopped_it_starting(),
  'Start it again': m.new_project_screen__step_start_it_again(),
  'Ask for a first draft': m.new_project_screen__step_ask_for_a_first_draft(),
})
const PLAN = ['Make the project', 'Set up its workspace', 'Set up its database', 'Start it', 'Ask for a first draft']

function progress(run?: ProjectRun) {
  const LABELS = labels()
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


type Tile = { hue: 'teal' | 'petrol' | 'sea'; Icon: LucideIcon; title: () => I18nString; text: () => I18nString; say: () => I18nString }

const TILES: Tile[] = [
  { hue: 'teal', Icon: Wand2, title: () => m.new_project__vibe_title(), text: () => m.new_project__vibe_text(), say: () => m.new_project__vibe_say() },
  { hue: 'petrol', Icon: GitBranch, title: () => m.new_project__import_title(), text: () => m.new_project__import_text(), say: () => m.new_project__import_say() },
  { hue: 'sea', Icon: FileSpreadsheet, title: () => m.new_project__sheets_title(), text: () => m.new_project__sheets_text(), say: () => m.new_project__sheets_say() },
  { hue: 'teal', Icon: Globe, title: () => m.new_project__site_title(), text: () => m.new_project__site_text(), say: () => m.new_project__site_say() },
  { hue: 'petrol', Icon: FolderOpen, title: () => m.new_project__folder_title(), text: () => m.new_project__folder_text(), say: () => m.new_project__folder_say() },
]

function OtherWays() {
  const { say } = useContext(ShellCtx)
  return (
    <section aria-label={m.new_project__more_label()}>
      <div className="mb-4">
        <h2 className="text-[26px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">{m.new_project__more_title()}</h2>
        <p className="mt-1 max-w-[62ch] text-[15px] text-muted-foreground text-pretty">{m.new_project__more_lead()}</p>
      </div>
      <div className="divide-y divide-border overflow-hidden rounded-[22px] border border-border bg-card">
        {TILES.map((t) => (
          <button
            key={t.title()}
            type="button"
            onClick={() => say(t.say())}
            className="flex w-full items-center gap-4 px-5 py-4 text-start transition-colors duration-140 hover:bg-secondary"
          >
            <span data-hue={t.hue} className="grid size-11 shrink-0 place-items-center rounded-xl bg-hero text-hero-ink">
              <t.Icon className="size-5.5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <b className="block text-[17px] leading-[1.3] text-foreground">{t.title()}</b>
              <small className="block text-[14px] text-ink-2">{t.text()}</small>
            </span>
            <ChevronRight className="rtl:-scale-x-100 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  )
}

export function NewProjectScreen() {
  const { st, go, goInterview, interview, retry, cancel, idea, setIdea, example, run, uses, setUses, files, setFiles } = useContext(OnbCtx)
  const [picked, setPicked] = useState(-1)
  const hero = useRef<HTMLElement>(null)
  const loading = st === 'loading' || !!interview
  const error = st === 'error'
  const navigate = useNavigate()
  const needsAi = /Choose your AI/.test(run?.error ?? '')
  const empty = st === 'empty'
  const usable = uses.devices.length > 0
  const ready = idea.trim().length >= 8 && usable

  useEffect(() => {
    if (st === 'error' && !idea.trim()) setIdea(example)
  }, [st])

  const pick = (i: number) => {
    setPicked(i)
    setIdea(sample().ideas[i].idea)
    hero.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    document.getElementById('idea')?.focus({ preventScroll: true })
  }

  return (
    <div className="mx-auto flex max-w-[1160px] flex-col gap-10 @min-[1700px]/app:max-w-[1380px]">
      <OpeningStage sectionRef={hero}>
        {interview ? (
          <MachineOpening
            icon={<MessageCircle className="me-3 inline-block size-9 align-middle" aria-hidden="true" />}
            title={m.new_project_screen__interview_title()}
            lead={m.new_project_screen__interview_lead()}
            steps={[
              { label: labels()['Make the project'], state: interview === 'making' ? 'now' : 'done' },
              { label: labels()['Set up its workspace'], state: interview === 'making' ? 'wait' : 'now' },
              { label: m.new_project_screen__interview_step_ready(), state: 'wait' },
            ]}
            onCancel={cancel}
          />
        ) : loading ? (
          <MachineOpening
            icon={<Sparkles className="me-3 inline-block size-9 align-middle" aria-hidden="true" />}
            title={m.new_project_screen__exploring_some_directions()}
            lead={m.new_project_screen__this_usually_takes_about_two()}
            steps={progress(run).map((s) => ({ ...s, ai: s.label === labels()['Ask for a first draft'] }))}
            onCancel={cancel}
          />
        ) : null}
        {error ? (
          <div
            role="alert"
            className="grid max-w-[620px] grid-cols-[auto_minmax(0,1fr)] items-center gap-x-4 gap-y-1.5 rounded-card border-[1.5px] border-destructive bg-card px-6 py-5 text-foreground"
          >
            <CircleAlert className="size-7 text-destructive-foreground" />
            <div>
              <b className="mb-0.5 block text-[17px]">{needsAi ? m.new_project_screen__error_needs_ai_title() : m.new_project_screen__error_title()}</b>
              <p className="text-[15px] text-ink-2 text-pretty">
                {needsAi
                  ? m.new_project_screen__error_needs_ai_text()
                  : m.new_project_screen__error_text()}
              </p>
              {run?.error ? (
                <details className="mt-2 text-[14px] text-ink-2">
                  <summary className="cursor-pointer font-semibold">{m.new_project_screen__what_went_wrong()}</summary>
                  <pre dir="ltr" className="mt-1.5 max-h-40 overflow-auto whitespace-pre-wrap text-[13px]">{asI18n(run.error)}</pre>
                </details>
              ) : null}
            </div>
            <div className="col-span-full flex flex-wrap gap-2">
              {needsAi ? (
                <Button variant="default" size="compact" type="button" onClick={() => navigate({ to: '/choose-ai', search: ((prev: object) => ({ ...prev, run: undefined })) as never })}>
                  
                  {m.new_project_screen__choose_your_ai()}
                </Button>
              ) : null}
              <Button variant="bordered" size="compact" type="button" onClick={retry}>
                
                {m.app_not_running__try_again()}
              </Button>
            </div>
          </div>
        ) : null}
        {loading ? null : (
          <NewProjectForm idea={idea} setIdea={setIdea} uses={uses} setUses={setUses} files={files} setFiles={setFiles} ready={ready} go={go} goInterview={goInterview} />
        )}
      </OpeningStage>

      {loading ? null : (
        <section aria-label={m.new_project_screen__ideas_label()}>
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-[26px] leading-[1.2] font-bold tracking-[-0.012em] text-balance">{m.new_project__ideas_title()}</h2>
            {empty ? null : <p className="text-[15px] text-muted-foreground text-pretty">{m.new_project_screen__ideas_hint()}</p>}
          </div>
          {empty ? (
            <EmptyState icon={Lightbulb} title={m.new_project_screen__no_ideas_title()} text={m.new_project_screen__no_ideas_text()} />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-x-5 gap-y-6">
              {sample().ideas.map((t, i) => (
                <button
                  key={t.title}
                  type="button"
                  aria-pressed={picked === i}
                  onClick={() => pick(i)}
                  className="group -m-2.5 flex flex-col gap-3 rounded-[20px] p-2.5 text-start transition-colors duration-140 hover:bg-secondary"
                >
                  <span className="relative block aspect-square overflow-hidden rounded-[16px] shadow-lift outline-primary transition-[transform,box-shadow] duration-240 ease-[cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-0.75 group-hover:shadow-deep group-active:scale-97 group-aria-pressed:outline-4 group-aria-pressed:outline-offset-3">
                    <svg viewBox="0 0 200 200" className="block size-full" aria-hidden="true">
                      {t.cover}
                    </svg>
                    <span className="absolute end-3 bottom-3 grid size-12.5 translate-y-2.5 place-items-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-[0_6px_16px_rgba(4,30,40,0.35)] transition-[opacity,transform] duration-240 ease-[cubic-bezier(.16,1,.3,1)] group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 group-aria-pressed:translate-y-0 group-aria-pressed:bg-success group-aria-pressed:opacity-100">
                      <ArrowRight className="rtl:-scale-x-100 size-5.5" />
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
      {loading ? null : <OtherWays />}
    </div>
  )
}
