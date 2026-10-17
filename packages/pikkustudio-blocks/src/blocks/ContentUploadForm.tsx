import { m } from '@/i18n/messages'
import { useEffect, useState, type FormEvent } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { HintNote } from './HintNote'

export function ContentUploadForm({
  isPublic,
  folder,
  uploading,
  failed,
  onUpload,
  onClose,
}: {
  isPublic: boolean
  folder: string
  uploading: boolean
  failed: boolean
  onUpload: (folder: string, file: File) => Promise<void>
  onClose: () => void
}) {
  const [where, setWhere] = useState(folder)
  const [file, setFile] = useState<File | null>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const ready = where.trim().length > 0 && !!file

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!ready || !file) return
    await onUpload(where.trim().replace(/^\/+|\/+$/g, ''), file)
  }

  return (
    <aside data-side-panel=""
      role="dialog"
      aria-label={m.content_upload__add_a_file()}
      className="fixed inset-y-0 end-0 z-50 flex w-102 max-w-full flex-col border-s border-border bg-card shadow-[0_24px_56px_-14px_rgba(8,40,52,0.45)] @min-[1700px]/app:w-120"
    >
      <header data-hue="petrol" className="flex items-center gap-3 bg-hero px-5 py-4 text-hero-ink">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-hero-btn-ink" aria-hidden="true">
          <Upload className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <h2 className="font-heading text-[22px] leading-[1.15] font-bold tracking-[-0.012em]">{m.content_upload__add_a_file()}</h2>
          <small className="block text-[14px] text-hero-ink-2">{isPublic ? m.content_upload__anyone_with_link() : m.content_upload__only_you()}</small>
        </span>
        <button type="button" aria-label={m.content_upload__close()} onClick={onClose} className="grid size-11 place-items-center rounded-full text-hero-ink transition-colors hover:bg-white/15">
          <X className="size-5.5" />
        </button>
      </header>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-4.5 overflow-auto px-5 pt-5 pb-6">
        <HintNote>{isPublic ? m.content_upload__public_note() : m.content_upload__private_note()}</HintNote>
        <label className="flex flex-col gap-1">
          <span className="text-px13 font-bold text-muted-foreground">{m.content_upload__folder()}</span>
          <Input shape="field" value={where} onChange={(e) => setWhere(e.target.value)} placeholder={m.content_upload__folder_example()} autoComplete="off" spellCheck={false} />
          <span className="text-px13 text-muted-foreground">{m.content_upload__folder_help()}</span>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-px13 font-bold text-muted-foreground">{m.content_upload__the_file()}</span>
          <Input shape="field" type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        {failed ? (
          <p role="alert" className="text-px15 text-destructive-foreground">
            {m.content_upload__that_could_not_be()}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <Button type="submit" variant="default" size="compact" disabled={!ready || uploading}>
            {uploading ? m.content_upload__adding() : m.content_upload__add_file()}
          </Button>
          <Button type="button" variant="ghost" size="compactTight" onClick={onClose}>
            {m.content_upload__cancel()}
          </Button>
        </div>
      </form>
    </aside>
  )
}
