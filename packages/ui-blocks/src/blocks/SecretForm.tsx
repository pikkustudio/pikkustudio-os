import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useEffect, useState, type FormEvent } from 'react'
import { Lock, X } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { HintNote } from './HintNote'

const NAME = /^[A-Za-z0-9_.-]{1,128}$/

export function SecretForm({
  name,
  fixed,
  saving,
  failed,
  onName,
  onSave,
  onClose,
}: {
  name: string
  fixed: boolean
  saving: boolean
  failed: boolean
  onName: (name: string) => void
  onSave: (name: string, value: string) => Promise<void>
  onClose: () => void
}) {
  const [value, setValue] = useState('')
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  const valid = NAME.test(name) && value.length > 0

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    await onSave(name, value)
    setValue('')
  }

  return (
    <aside data-side-panel=""
      role="dialog"
      aria-label={fixed ? m.secret_form__change_a_secret() : m.secret_form__add_a_secret()}
      className="fixed inset-y-0 end-0 z-50 flex w-102 max-w-full flex-col border-s border-border bg-card shadow-[0_24px_56px_-14px_rgba(8,40,52,0.45)] @min-[1700px]/app:w-120"
    >
      <header data-hue="petrol" className="flex items-center gap-3 bg-hero px-5 py-4 text-hero-ink">
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-hero-btn-ink" aria-hidden="true">
          <Lock className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <h2 className="font-heading text-[22px] leading-[1.15] font-bold tracking-[-0.012em]">{fixed ? asI18n(name) : m.secret_form__add_a_secret()}</h2>
          <small className="block text-[14px] text-hero-ink-2">{fixed ? m.secret_form__saving_replaces_what_was() : m.secret_form__a_password_or_key()}</small>
        </span>
        <button type="button" aria-label={m.secret_form__close()} onClick={onClose} className="grid size-11 place-items-center rounded-full text-hero-ink transition-colors hover:bg-white/15">
          <X className="size-5.5" />
        </button>
      </header>
      <form onSubmit={submit} className="flex flex-1 flex-col gap-4.5 overflow-auto px-5 pt-5 pb-6">
        <HintNote>
          <span className="inline-flex items-center gap-2">
            <Lock className="size-4 shrink-0" />
            
            {m.secret_form__locked_in_this_browser()}
          </span>
        </HintNote>
        {fixed ? null : (
          <label className="flex flex-col gap-1">
            <span className="text-px13 font-bold text-muted-foreground">{m.secret_form__name()}</span>
            <Input shape="field" value={name} onChange={(e) => onName(e.target.value)} placeholder={m.secret_form__stripe_key()} autoComplete="off" spellCheck={false} />
            <span className="text-px13 text-muted-foreground">{m.secret_form__letters_numbers_and_underscores()}</span>
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-px13 font-bold text-muted-foreground">{m.secret_form__the_secret()}</span>
          <Input shape="field" type="password" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" autoFocus={fixed} />
        </label>
        {failed ? (
          <p role="alert" className="text-px15 text-destructive-foreground">
            
            {m.secret_form__that_could_not_be()}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <Button type="submit" variant="default" size="compact" disabled={!valid || saving}>
            {saving ? m.secret_form__saving() : m.secret_form__save_secret()}
          </Button>
          <Button type="button" variant="ghost" size="compactTight" onClick={onClose}>
            
            {m.secret_form__cancel()}
          </Button>
        </div>
      </form>
    </aside>
  )
}
