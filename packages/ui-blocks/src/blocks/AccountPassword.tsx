import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useState, type FormEvent } from 'react'
import { KeyRound } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { FixNotice } from './FixNotice'
import { useProjectAction } from '../lib/projectRpc'

export function AccountPassword({ projectKey, userId, name }: { projectKey: string; userId: string; name: string }) {
  const [editing, setEditing] = useState(false)
  const [password, setPassword] = useState('')
  const [saved, setSaved] = useState(false)
  const save = useProjectAction<{ userId: string; newPassword: string }>(projectKey, 'admin:setUserPassword')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!password || save.isPending) return
    save.reset()
    save.mutate({ userId, newPassword: password }, { onSuccess: () => { setSaved(true); setEditing(false); setPassword('') } })
  }

  return (
    <section className="flex flex-col gap-3" aria-label={m.accounts_password__title()}>
      <h3 className="font-heading text-[18px] font-bold">{m.accounts_password__title()}</h3>
      <p className="text-px15 text-ink-2">{m.accounts_password__explain({ name: asI18n(name) })}</p>
      {saved ? <p role="status" className="text-px15 font-semibold text-ink-2">{m.accounts_password__saved({ name: asI18n(name) })}</p> : null}
      {editing ? (
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-px13 font-bold text-muted-foreground">{m.accounts_password__new()}</span>
            <Input shape="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" autoFocus />
          </label>
          {save.error ? (
            <FixNotice
              title={m.accounts_password__failed_title()}
              body={m.accounts_password__failed_body()}
              ask={m.accounts_panel__failed_ask({ name: asI18n(name), details: asI18n(save.error instanceof Error ? save.error.message : '') })}
              onRetry={() => save.reset()}
            />
          ) : null}
          <div className="flex items-center gap-2">
            <Button type="submit" variant="bordered" size="compact" disabled={!password || save.isPending} aria-busy={save.isPending}>
              {m.accounts_password__save()}
            </Button>
            <Button type="button" variant="ghost" size="compactTight" onClick={() => { setEditing(false); setPassword(''); save.reset() }}>
              {m.accounts_invite__cancel()}
            </Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="bordered" size="page" className="self-start" onClick={() => { setSaved(false); setEditing(true) }}>
          <KeyRound className="size-4.5" />
          {m.accounts_password__choose()}
        </Button>
      )}
    </section>
  )
}
