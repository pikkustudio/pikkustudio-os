import { asI18n, type I18nNode } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useRef, useState } from 'react'
import { ArrowRight, Check, Monitor, Paperclip, Smartphone, Sparkles, X } from 'lucide-react'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import type { Uses } from './OnboardingLayout'

const PLATFORMS = [
  { id: 'browser', name: 'Browser', icon: <Monitor className="size-4.5" /> },
  { id: 'phones', name: 'Mobile', icon: <Smartphone className="size-4.5" /> },
]

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: I18nNode }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onClick}
      className={`flex h-11 items-center gap-2 rounded-full border-2 px-4 text-[15px] font-semibold transition ${on ? 'border-hero-ink bg-hero-ink text-hero' : 'border-hero-ink/35 hover:border-hero-ink/70'}`}
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
}: {
  idea: string
  setIdea: (v: string) => void
  uses: Uses
  setUses: (v: Uses) => void
  files: File[]
  setFiles: (v: File[]) => void
  ready: boolean
  go: () => void
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
        <Textarea id="idea" tone="hero" value={idea} onChange={(e) => setIdea(e.target.value)} placeholder={m.new_project_form__idea_placeholder()} />
        <div className="flex flex-wrap items-center gap-2">
          <input ref={picker} id="attach" type="file" multiple hidden onChange={(e) => add(e.target.files)} />
          <Button variant="heroGhost" size="page" type="button" onClick={() => picker.current?.click()}>
            <Paperclip className="size-4.5" />
            {m.new_project_form__add_files()}
          </Button>
          {files.map((f) => (
            <span key={`${f.name}-${f.size}`} className="flex h-10 max-w-64 items-center gap-1.5 rounded-full border border-hero-ink/35 pe-1.5 ps-3.5 text-[14.5px] font-semibold">
              <span className="truncate">{asI18n(f.name)}</span>
              <button type="button" aria-label={m.new_project_form__remove({ name: f.name })} onClick={() => setFiles(files.filter((x) => x !== f))} className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-hero-ink/12">
                <X className="size-4" />
              </button>
            </span>
          ))}
          {files.length === 0 ? <span className="text-[14.5px] text-hero-ink-2">{m.new_project_form__drop_hint()}</span> : null}
          {tooBig ? <span role="alert" className="text-[14.5px] font-semibold">{m.new_project_form__too_big()}</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-3">
          <div role="group" aria-label={m.new_project_form__where_label()} className="flex items-center gap-2">
            {PLATFORMS.map((p) => (
              <Pill key={p.id} on={uses.devices.includes(p.id)} onClick={() => flip(p.id)}>
                {p.icon}
                {asI18n(p.name)}
              </Pill>
            ))}
          </div>
          <Button variant="hero" size="pageLg" type="button" disabled={!ready} onClick={go} className="ms-auto">
            <Sparkles className="size-5.5" />
            <span>{m.new_project_form__start()}</span>
            <ArrowRight className="rtl:-scale-x-100 size-5.5" />
          </Button>
        </div>
        <p className="min-h-5 text-[14.5px] text-hero-ink-2">
          {uses.devices.length === 0
            ? m.new_project_form__pick_one()
            : uses.devices.includes('phones')
              ? m.new_project_form__mobile_note()
              : m.new_project_form__nothing_online()}
        </p>
      </section>
    </div>
  )
}
