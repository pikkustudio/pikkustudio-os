import { asI18n, type I18nNode } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useRef, useState } from 'react'
import { ArrowRight, Check, MessageCircle, Monitor, Paperclip, Smartphone, Sparkles, X } from 'lucide-react'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import type { Uses } from './OnboardingLayout'

const PLATFORMS = [
  { id: 'browser', name: 'Browser', icon: <Monitor className="size-4" /> },
  { id: 'phones', name: 'Mobile', icon: <Smartphone className="size-4" /> },
]

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: I18nNode }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onClick}
      className={`flex h-9 items-center gap-1.5 rounded-full border-[1.5px] px-3 text-[14.5px] font-semibold transition ${on ? 'border-foreground bg-foreground text-background' : 'border-foreground/25 text-muted-foreground hover:border-foreground/60 hover:text-foreground'}`}
    >
      {on ? <Check className="size-4" strokeWidth={3} /> : null}
      {children}
    </button>
  )
}

export function NewProjectForm({
  idea,
  setIdea,
  uses,
  setUses,
  files,
  setFiles,
  ready,
  go,
  goInterview,
}: {
  idea: string
  setIdea: (v: string) => void
  uses: Uses
  setUses: (v: Uses) => void
  files: File[]
  setFiles: (v: File[]) => void
  ready: boolean
  go: () => void
  goInterview?: () => void
}) {
  const [tooBig, setTooBig] = useState(false)
  const [over, setOver] = useState(false)
  const picker = useRef<HTMLInputElement>(null)
  const add = (list: FileList | null) => {
    const next = Array.from(list ?? [])
    setTooBig(next.some((f) => f.size > 25 * 1024 * 1024))
    const fits = next.filter((f) => f.size <= 25 * 1024 * 1024 && !files.some((x) => x.name === f.name && x.size === f.size))
    setFiles([...files, ...fits].slice(0, 20))
    if (picker.current) picker.current.value = ''
  }
  const flip = (id: string) => setUses({ ...uses, devices: uses.devices.includes(id) ? uses.devices.filter((x) => x !== id) : [...uses.devices, id] })
  return (
    <div className="flex max-w-[680px] flex-col gap-4">
      <h1 className="max-w-[20ch] text-[44px] leading-[1.06] font-bold tracking-[-0.02em] text-balance group-data-open/shell:text-[38px] @min-[1700px]/app:text-[52px]">{m.new_project_form__title()}</h1>
      <section
        aria-label={m.new_project_form__build_an_app()}
        className={`flex flex-col gap-3.5 rounded-[22px] transition ${over ? 'outline-2 outline-offset-8 outline-dashed outline-hero-ink' : ''}`}
        onDragOver={(e) => {
          if (!e.dataTransfer.types.includes('Files')) return
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false)
        }}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return
          e.preventDefault()
          setOver(false)
          add(e.dataTransfer.files)
        }}
      >
        <label htmlFor="idea" className="text-[17px] font-bold">
          {m.new_project_form__label()}
        </label>
        <div className="rounded-[20px] border-[2.5px] border-transparent bg-field text-foreground transition-all hover:border-hero-ink/45 focus-within:border-hero-ink focus-within:ring-5 focus-within:ring-hero-ink/25">
          <Textarea
            id="idea"
            tone="hero"
            className="min-h-24 resize-none border-0 bg-transparent pb-2 hover:border-transparent focus-visible:ring-0"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder={m.new_project_form__idea_placeholder()}
          />
          <div className="flex flex-wrap items-center gap-2 px-3.5 pb-3.5">
            <input ref={picker} id="attach" type="file" multiple hidden onChange={(e) => add(e.target.files)} />
            <button
              type="button"
              title={m.new_project_form__drop_hint()}
              onClick={() => picker.current?.click()}
              className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[14.5px] font-semibold text-muted-foreground transition hover:bg-foreground/8 hover:text-foreground"
            >
              <Paperclip className="size-4.5" />
              {m.new_project_form__add_files()}
            </button>
            {files.map((f) => (
              <span key={`${f.name}-${f.size}`} className="flex h-9 max-w-56 items-center gap-1 rounded-full border-[1.5px] border-foreground/25 pe-1 ps-3 text-[14px] font-semibold">
                <span className="truncate">{asI18n(f.name)}</span>
                <button type="button" aria-label={m.new_project_form__remove({ name: f.name })} onClick={() => setFiles(files.filter((x) => x !== f))} className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-foreground/10">
                  <X className="size-4" />
                </button>
              </span>
            ))}
            <div role="group" aria-label={m.new_project_form__where_label()} className="ms-auto flex items-center gap-2">
              {PLATFORMS.map((p) => (
                <Pill key={p.id} on={uses.devices.includes(p.id)} onClick={() => flip(p.id)}>
                  {p.icon}
                  {asI18n(p.name)}
                </Pill>
              ))}
            </div>
          </div>
        </div>
        {tooBig ? <span role="alert" className="text-[14.5px] font-semibold">{m.new_project_form__too_big()}</span> : null}
        <div className="flex flex-col gap-4">
          {goInterview ? (
            <Button variant="hero" size="pageLg" type="button" data-testid="start-interview" disabled={!ready} onClick={goInterview}>
              <MessageCircle className="size-5.5" />
              <span>{m.new_project_form__start()}</span>
              <ArrowRight className="rtl:-scale-x-100 size-5.5" />
            </Button>
          ) : (
            <Button variant="hero" size="pageLg" type="button" data-testid="start-designing" disabled={!ready} onClick={go}>
              <Sparkles className="size-5.5" />
              <span>{m.new_project_form__start()}</span>
              <ArrowRight className="rtl:-scale-x-100 size-5.5" />
            </Button>
          )}
        </div>
        {uses.devices.length === 0 || uses.devices.includes('phones') ? (
          <p className="text-[14.5px] text-hero-ink-2">{uses.devices.length === 0 ? m.new_project_form__pick_one() : m.new_project_form__mobile_note()}</p>
        ) : null}
      </section>
    </div>
  )
}
