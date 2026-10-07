import { useRef, useState, type ReactNode } from 'react'
import { ArrowRight, Check, Monitor, Paperclip, Smartphone, Sparkles, Lightbulb, X } from 'lucide-react'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { StatusLine } from '../blocks/StatusLine'
import type { Uses } from './OnboardingLayout'

const PLATFORMS = [
  { id: 'browser', name: 'On the web', icon: <Monitor className="size-4.5" /> },
  { id: 'phones', name: 'On phones', icon: <Smartphone className="size-4.5" /> },
]

function Choice({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Button type="button" role="checkbox" aria-checked={on} variant={on ? 'selected' : 'bordered'} size="page" onClick={onClick}>
      {on ? <Check className="size-4.5" strokeWidth={3} /> : null}
      {children}
    </Button>
  )
}

export function NewProjectForm({
  idea,
  setIdea,
  example,
  uses,
  setUses,
  files,
  setFiles,
  ready,
  go,
}: {
  idea: string
  setIdea: (v: string) => void
  example: string
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
  const none = uses.devices.length === 0
  return (
    <form
      aria-label="Start a project"
      onSubmit={(e) => {
        e.preventDefault()
        if (ready) go()
      }}
      className={`flex flex-col gap-6 rounded-card border bg-card p-6 shadow-card transition ${over ? 'border-primary' : 'border-border'}`}
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
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <label htmlFor="idea" className="text-px20 leading-[1.2] font-bold">
            What do you want to make?
          </label>
          <Button type="button" variant="quiet" onClick={() => setIdea(example)}>
            <Lightbulb className="size-4" />
            Show me an example
          </Button>
        </div>
        <Textarea id="idea" tone="field" rows={4} value={idea} onChange={(e) => setIdea(e.target.value)} placeholder={example} />
        <p className="text-px14 text-ink-2">A sentence or two is plenty. You can change anything later.</p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-px14 font-bold text-muted-foreground" id="uses-label">
          Where will people use it?
        </h2>
        <div role="group" aria-labelledby="uses-label" className="flex flex-wrap items-center gap-2">
          {PLATFORMS.map((p) => (
            <Choice key={p.id} on={uses.devices.includes(p.id)} onClick={() => flip(p.id)}>
              {p.icon}
              {p.name}
            </Choice>
          ))}
        </div>
        <p className={`text-px14 ${none ? 'font-semibold text-destructive-foreground' : 'text-ink-2'}`} role={none ? 'alert' : undefined}>
          {none
            ? 'Pick at least one: the web, phones, or both.'
            : uses.devices.includes('phones')
              ? 'Phones means iPhone and Android. It takes longer to build and publish, so many people start on the web.'
              : 'Nothing goes online until you say so.'}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-px14 font-bold text-muted-foreground">Anything I should read first? (optional)</h2>
        <div className="flex flex-wrap items-center gap-2">
          <input ref={picker} id="attach" type="file" multiple hidden onChange={(e) => add(e.target.files)} />
          <Button variant="bordered" size="compact" type="button" onClick={() => picker.current?.click()}>
            <Paperclip className="size-4.5" />
            Add files
          </Button>
          {files.map((f) => (
            <span key={`${f.name}-${f.size}`} className="flex h-9.5 max-w-64 items-center gap-1.5 rounded-full border-[1.5px] border-input pr-1.5 pl-3.5 text-px14 font-bold">
              <span className="truncate">{f.name}</span>
              <button type="button" aria-label={`Remove ${f.name}`} onClick={() => setFiles(files.filter((x) => x !== f))} className="grid size-7 shrink-0 place-items-center rounded-full hover:bg-secondary">
                <X className="size-4" />
              </button>
            </span>
          ))}
          {files.length === 0 ? <span className="text-px14 text-ink-2">Pictures, documents or notes. Drop them here or add them.</span> : null}
        </div>
        {tooBig ? <StatusLine tone="bad" text="A file was left out because it is over 25 MB." /> : null}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-5">
        <Button type="submit" size="pageLg" disabled={!ready}>
          <Sparkles className="size-5" />
          Start building
          <ArrowRight className="size-5" />
        </Button>
      </div>
    </form>
  )
}
