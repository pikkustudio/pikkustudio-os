import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useState } from 'react'
import { LogOut, Pause, Play, Trash2, UserRound } from 'lucide-react'
import { Button } from '../ui/button'
import { SidePanel } from './SidePanel'
import { Dot } from './RowCard'
import { FixNotice } from './FixNotice'
import { useProjectAction } from '../lib/projectRpc'
import { accountName, joinedOn, type Account } from '../lib/accounts'

export function AccountPanel({ projectKey, account, onChanged, onClose }: { projectKey: string; account: Account; onChanged: () => void; onClose: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const [signedOut, setSignedOut] = useState(false)
  const ban = useProjectAction<{ userId: string; banned: boolean }>(projectKey, 'admin:setUserBanned')
  const out = useProjectAction<{ userId: string }>(projectKey, 'admin:revokeUserSessions')
  const remove = useProjectAction<{ userId: string }>(projectKey, 'admin:removeUser')
  const busy = ban.isPending || out.isPending || remove.isPending
  const failed = ban.error ?? out.error ?? remove.error
  const name = accountName(account)
  const joined = joinedOn(account.createdAt)
  const clear = () => {
    ban.reset()
    out.reset()
    remove.reset()
  }

  const setBanned = (banned: boolean) => {
    clear()
    ban.mutate({ userId: account.id, banned }, { onSuccess: () => { onChanged(); onClose() } })
  }
  const signOut = () => {
    clear()
    out.mutate({ userId: account.id }, { onSuccess: () => setSignedOut(true) })
  }
  const erase = () => {
    clear()
    remove.mutate({ userId: account.id }, { onSuccess: () => { onChanged(); onClose() } })
  }

  return (
    <SidePanel icon={UserRound} title={asI18n(name)} sub={asI18n(account.email)} label={m.accounts_panel__label()} onClose={onClose}>
      {joined ? <p className="text-px15 text-ink-2">{m.accounts_row__joined({ date: asI18n(joined) })}</p> : null}
      <Dot tone={account.banned ? 'warn' : 'ok'}>{account.banned ? m.accounts_row__paused() : m.accounts_row__active()}</Dot>
      {failed ? (
        <FixNotice
          title={m.accounts_panel__failed_title()}
          body={m.accounts_panel__failed_body()}
          ask={m.accounts_panel__failed_ask({ name: asI18n(name), details: asI18n(failed instanceof Error ? failed.message : '') })}
          onRetry={clear}
        />
      ) : null}
      {account.banned ? (
        <>
          <p className="text-px15 text-ink-2">{m.accounts_panel__resume_explain({ name: asI18n(name) })}</p>
          <Button type="button" variant="default" size="page" className="self-start" disabled={busy} aria-busy={ban.isPending} onClick={() => setBanned(false)}>
            <Play className="size-4.5" />
            {m.accounts_panel__resume()}
          </Button>
        </>
      ) : (
        <>
          <p className="text-px15 text-ink-2">{m.accounts_panel__pause_explain({ name: asI18n(name) })}</p>
          <Button type="button" variant="default" size="page" className="self-start" disabled={busy} aria-busy={ban.isPending} onClick={() => setBanned(true)}>
            <Pause className="size-4.5" />
            {m.accounts_panel__pause()}
          </Button>
        </>
      )}
      <p className="text-px15 text-ink-2">{m.accounts_panel__signout_explain()}</p>
      <Button type="button" variant="bordered" size="page" className="self-start" disabled={busy} aria-busy={out.isPending} onClick={signOut}>
        <LogOut className="size-4.5" />
        {m.accounts_panel__signout()}
      </Button>
      {signedOut ? <p role="status" className="text-px15 font-semibold text-ink-2">{m.accounts_panel__signed_out()}</p> : null}
      <p className="text-px15 text-ink-2">{m.accounts_panel__remove_explain()}</p>
      {confirming ? (
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="destructive" size="page" disabled={busy} aria-busy={remove.isPending} onClick={erase}>
            {m.accounts_panel__remove_confirm()}
          </Button>
          <Button type="button" variant="bordered" size="page" onClick={() => setConfirming(false)}>
            {m.accounts_panel__keep()}
          </Button>
        </div>
      ) : (
        <Button type="button" variant="bordered" size="page" className="self-start" disabled={busy} onClick={() => setConfirming(true)}>
          <Trash2 className="size-4.5" />
          {m.accounts_panel__remove()}
        </Button>
      )}
    </SidePanel>
  )
}
