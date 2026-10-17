import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useState, type FormEvent } from 'react'
import { KeyRound, Lock, SlidersHorizontal } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { SidePanel } from './SidePanel'
import { HintNote } from './HintNote'
import { valueState, type ProjectValue } from '../lib/projectSecrets'

/** Fill in one secret or one setting the project asks for. A secret's value is never shown, only replaced. */
export function ProjectValueDrawer({
  kind,
  item,
  current,
  hasValue,
  sealed,
  saving,
  failed,
  onSave,
  onClose,
}: {
  kind: 'secret' | 'setting'
  item: ProjectValue
  current?: string | null
  hasValue: boolean
  sealed: boolean
  saving: boolean
  failed: boolean
  onSave: (value: string) => Promise<void>
  onClose: () => void
}) {
  const [value, setValue] = useState(current ?? '')
  const secret = kind === 'secret'
  const state = valueState(item, hasValue)
  const valid = value.length > 0 && value !== (current ?? '')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!valid) return
    await onSave(value)
  }

  return (
    <SidePanel
      icon={secret ? KeyRound : SlidersHorizontal}
      label={secret ? m.project_secrets__drawer_secret() : m.project_secrets__drawer_setting()}
      title={asI18n(item.label)}
      sub={state === 'saved' ? (secret ? m.project_secrets__drawer_replaces() : m.project_secrets__drawer_setting_sub()) : state === 'optional' ? m.project_secrets__drawer_optional() : m.project_secrets__drawer_needed()}
      onClose={onClose}
    >
      <form onSubmit={submit} className="flex flex-col gap-4.5">
        {item.about ? <p className="text-px15 text-ink-2">{asI18n(item.about)}</p> : null}
        {secret ? (
          <HintNote>
            <span className="inline-flex items-center gap-2">
              <Lock className="size-4 shrink-0" />
              {sealed ? m.project_secrets__drawer_sealed() : m.project_secrets__drawer_local()}
            </span>
          </HintNote>
        ) : null}
        <label className="flex flex-col gap-1">
          <span className="text-px13 font-bold text-muted-foreground">{secret ? m.project_secrets__drawer_the_secret() : m.project_secrets__drawer_the_value()}</span>
          <Input shape="field" type={secret ? 'password' : 'text'} value={value} onChange={(e) => setValue(e.target.value)} autoComplete="off" spellCheck={false} autoFocus />
        </label>
        {item.docsUrl ? (
          <a href={item.docsUrl} target="_blank" rel="noreferrer" className="self-start text-px14 font-semibold text-primary underline underline-offset-4">
            {m.project_secrets__drawer_where()}
          </a>
        ) : null}
        {failed ? (
          <p role="alert" className="text-px15 text-destructive-foreground">
            {m.project_secrets__drawer_failed()}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <Button type="submit" variant="default" size="compact" disabled={!valid || saving}>
            {saving ? m.project_secrets__drawer_saving() : m.project_secrets__drawer_save()}
          </Button>
          <Button type="button" variant="ghost" size="compactTight" onClick={onClose}>
            {m.project_secrets__drawer_cancel()}
          </Button>
        </div>
      </form>
    </SidePanel>
  )
}
