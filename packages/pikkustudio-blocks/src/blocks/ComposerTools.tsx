import { useEffect, useRef, useState, type RefObject } from 'react'
import { Check, ChevronUp, FileText, Loader2, Paperclip, TriangleAlert, X } from 'lucide-react'
import { asI18n } from '@pikku/react'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { m } from '@/i18n/messages'
import type { ComposerExtras } from '../lib/composer-extras'
import { MicButton } from './MicButton'

const size = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`)

type Tier = 'fast' | 'balanced' | 'best'
type Models = { current: string | null; fallback: string | null; models: { id: string; tier: Tier }[] }

const tierLabel = (tier: Tier) => (tier === 'fast' ? m.composer_tools__model_fast() : tier === 'best' ? m.composer_tools__model_best() : m.composer_tools__model_balanced())
const tierHint = (tier: Tier) => (tier === 'fast' ? m.composer_tools__model_fast_hint() : tier === 'best' ? m.composer_tools__model_best_hint() : m.composer_tools__model_balanced_hint())

const storeKey = (key: string) => `studio:builder-model:${key}`
const remembered = (key: string) => {
  try {
    return localStorage.getItem(storeKey(key))
  } catch {
    return null
  }
}
const remember = (key: string, model: string | null) => {
  try {
    if (model) localStorage.setItem(storeKey(key), model)
    else localStorage.removeItem(storeKey(key))
  } catch {}
}

function ModelPicker({ projectKey }: { projectKey: string }) {
  const query = usePikkuQuery('studio:builderModels' as never, { key: projectKey } as never, { enabled: !!projectKey, staleTime: 60_000 } as never) as unknown as { data?: Models; refetch: () => unknown }
  const save = usePikkuMutation('studio:setBuilderModel' as never) as unknown as { mutateAsync: (v: { key: string; model: string }) => Promise<{ model: string | null }> }
  const [open, setOpen] = useState(false)
  const [picked, setPicked] = useState<string | null>(null)
  const [problem, setProblem] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const applied = useRef('')
  const data = query.data

  useEffect(() => {
    setPicked(remembered(projectKey))
    applied.current = ''
  }, [projectKey])

  useEffect(() => {
    if (!data || !picked || applied.current === `${projectKey}:${picked}` || data.current === picked) return
    if (!data.models.some((x) => x.id === picked)) return
    applied.current = `${projectKey}:${picked}`
    save.mutateAsync({ key: projectKey, model: picked }).catch(() => setProblem(true))
  }, [data, picked, projectKey, save])

  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  if (!data || data.models.length < 2) return null
  const now = picked && data.models.some((x) => x.id === picked) ? picked : (data.current ?? data.fallback)
  const current = data.models.find((x) => x.id === now)
  const choose = async (id: string) => {
    setProblem(false)
    const isDefault = id === data.fallback
    try {
      await save.mutateAsync({ key: projectKey, model: isDefault ? '' : id })
      setPicked(isDefault ? null : id)
      remember(projectKey, isDefault ? null : id)
      applied.current = isDefault ? '' : `${projectKey}:${id}`
      setOpen(false)
      void query.refetch()
    } catch {
      setProblem(true)
    }
  }
  return (
    <div ref={root} className="relative ms-auto min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        data-testid="model-picker"
        className="inline-flex h-9 max-w-full items-center gap-1.5 rounded-full px-3 text-[13px] text-muted-foreground transition-colors duration-140 hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
      >
        <span className="truncate font-medium">{current ? tierLabel(current.tier) : m.composer_tools__model_default()}</span>
        <span dir="ltr" className="truncate font-mono text-[11px] opacity-70">{now}</span>
        <ChevronUp className="size-3.5 shrink-0" aria-hidden="true" />
      </button>
      {open ? (
        <div role="listbox" aria-label={m.composer_tools__model_choose()} className="absolute end-0 bottom-full z-20 mb-1 w-72 max-w-[calc(100vw-2.5rem)] overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <ul className="max-h-64 overflow-y-auto p-1">
            {data.models.map((x) => (
              <li key={x.id} role="option" aria-selected={x.id === now}>
                <button type="button" onClick={() => void choose(x.id)} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-start hover:bg-secondary focus-visible:bg-secondary focus-visible:outline-none">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium text-foreground">
                      {tierLabel(x.tier)}
                      {x.id === data.fallback ? <span className="ms-2 text-[12px] font-normal text-muted-foreground">{m.composer_tools__model_default()}</span> : null}
                    </span>
                    <span className="block text-[12px] text-muted-foreground">{tierHint(x.tier)}</span>
                    <span dir="ltr" className="block truncate text-start font-mono text-[11px] text-muted-foreground">{x.id}</span>
                  </span>
                  {x.id === now ? <Check className="size-4 shrink-0 text-primary" /> : null}
                </button>
              </li>
            ))}
          </ul>
          <p className="border-t border-border px-3 py-2 text-[12px] text-muted-foreground">{m.composer_tools__model_when()}</p>
        </div>
      ) : null}
      {problem ? (
        <p role="alert" className="absolute end-0 bottom-full mb-1 flex w-64 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[12px] text-destructive shadow-lg">
          <span className="flex-1 text-pretty">{m.composer_tools__model_failed()}</span>
          <button type="button" onClick={() => setProblem(false)} className="font-bold underline">{m.composer_tools__dismiss()}</button>
        </p>
      ) : null}
    </div>
  )
}

export function ComposerTools({ projectKey, extras, field, onText }: { projectKey: string; extras: ComposerExtras; field: RefObject<HTMLTextAreaElement | null>; onText: (text: string) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const { add } = extras

  useEffect(() => {
    const el = field.current
    if (!el) return
    const has = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files')
    const over = (e: DragEvent) => {
      if (!has(e)) return
      e.preventDefault()
      setDragging(true)
    }
    const leave = () => setDragging(false)
    const drop = (e: DragEvent) => {
      if (!has(e)) return
      e.preventDefault()
      setDragging(false)
      add(Array.from(e.dataTransfer!.files))
    }
    const paste = (e: ClipboardEvent) => {
      const files = Array.from(e.clipboardData?.files ?? [])
      if (!files.length) return
      e.preventDefault()
      add(files)
    }
    el.addEventListener('dragover', over)
    el.addEventListener('dragleave', leave)
    el.addEventListener('drop', drop)
    el.addEventListener('paste', paste)
    return () => {
      el.removeEventListener('dragover', over)
      el.removeEventListener('dragleave', leave)
      el.removeEventListener('drop', drop)
      el.removeEventListener('paste', paste)
    }
  }, [field, add])

  return (
    <div className="flex flex-col gap-2 bg-card px-5 pb-3.5" data-testid="composer-tools">
      {extras.files.length ? (
        <ul className="flex flex-wrap gap-2" aria-label={m.composer_tools__attached_files()}>
          {extras.files.map((f) => (
            <li key={f.id} className={`flex max-w-full min-w-0 items-center gap-2 rounded-xl border bg-secondary py-1 ps-1 pe-1 ${f.status === 'failed' ? 'border-destructive/50' : 'border-border'}`} title={f.name}>
              <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-background text-muted-foreground">
                {f.preview ? <img src={f.preview} alt="" className="size-full object-cover" /> : <FileText className="size-4.5" />}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="max-w-40 truncate text-[13px] leading-[1.3] font-medium text-foreground">{f.name}</span>
                <span className={`text-[12px] leading-[1.3] ${f.status === 'failed' ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {f.status === 'uploading' ? <span className="inline-flex items-center gap-1"><Loader2 className="size-3 animate-spin" />{m.composer_tools__uploading()}</span> : f.status === 'failed' ? <span role="alert" className="inline-flex items-center gap-1"><TriangleAlert className="size-3" />{asI18n(f.problem ?? '')}</span> : size(f.size)}
                </span>
              </span>
              {f.status === 'failed' && f.source.size <= 25 * 1024 * 1024 ? (
                <button type="button" onClick={() => extras.retry(f.id)} className="rounded-md px-1.5 text-[12px] font-bold text-foreground underline underline-offset-2 hover:no-underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">{m.composer_tools__try_again()}</button>
              ) : null}
              <button type="button" aria-label={m.composer_tools__remove_file({ name: f.name })} title={m.composer_tools__remove_file({ name: f.name })} onClick={() => extras.remove(f.id)} className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex min-h-9 flex-wrap items-center gap-x-2 gap-y-1">
        <input ref={input} type="file" multiple hidden onChange={(e) => { add(Array.from(e.target.files ?? [])); e.target.value = '' }} data-testid="attach-input" />
        <button type="button" aria-label={m.composer_tools__attach()} title={m.composer_tools__attach()} onClick={() => input.current?.click()} className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors duration-140 hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none">
          <Paperclip className="size-4.5" />
        </button>
        <MicButton onText={onText} />
        {dragging ? <span className="text-[13px] text-primary">{m.composer_tools__drop_here()}</span> : null}
        <ModelPicker projectKey={projectKey} />
      </div>
    </div>
  )
}
