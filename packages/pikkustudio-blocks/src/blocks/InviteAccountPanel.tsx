import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useState, type FormEvent } from 'react'
import { UserPlus } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { SidePanel } from './SidePanel'
import { FixNotice } from './FixNotice'
import { useProjectAction } from '../lib/projectRpc'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function InviteAccountPanel({ projectKey, onInvited, onClose }: { projectKey: string; onInvited: () => void; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [sent, setSent] = useState<string | null>(null)
  const create = useProjectAction<{ email: string; name?: string }>(projectKey, 'admin:createUser')
  const link = useProjectAction<{ email: string }>(projectKey, 'admin:sendSignInLink')
  const sending = create.isPending || link.isPending
  const failed = create.error ?? link.error
  const valid = EMAIL.test(email.trim())

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!valid || sending) return
    create.reset()
    link.reset()
    const address = email.trim()
    try {
      await create.mutateAsync({ email: address, ...(name.trim() ? { name: name.trim() } : {}) })
      await link.mutateAsync({ email: address })
      setSent(address)
      onInvited()
    } catch {
      return
    }
  }

  return (
    <SidePanel icon={UserPlus} title={m.accounts_invite__title()} sub={m.accounts_invite__sub()} label={m.accounts_invite__title()} onClose={onClose}>
      {sent ? (
        <>
          <p role="status" className="text-px15 text-ink-2">{m.accounts_invite__sent({ email: asI18n(sent) })}</p>
          <Button type="button" variant="default" size="page" className="self-start" onClick={onClose}>
            {m.accounts_invite__done()}
          </Button>
        </>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4.5">
          <label className="flex flex-col gap-1">
            <span className="text-px13 font-bold text-muted-foreground">{m.accounts_invite__email()}</span>
            <Input shape="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" autoFocus />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-px13 font-bold text-muted-foreground">{m.accounts_invite__name()}</span>
            <Input shape="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
          </label>
          {failed ? (
            <FixNotice
              title={m.accounts_invite__failed_title()}
              body={m.accounts_invite__failed_body()}
              ask={m.accounts_invite__failed_ask({ email: asI18n(email.trim()), details: asI18n(failed instanceof Error ? failed.message : '') })}
            />
          ) : null}
          <div className="flex items-center gap-2">
            <Button type="submit" variant="default" size="compact" disabled={!valid || sending} aria-busy={sending}>
              {sending ? m.accounts_invite__sending() : m.accounts_invite__send()}
            </Button>
            <Button type="button" variant="ghost" size="compactTight" onClick={onClose}>
              {m.accounts_invite__cancel()}
            </Button>
          </div>
        </form>
      )}
    </SidePanel>
  )
}
