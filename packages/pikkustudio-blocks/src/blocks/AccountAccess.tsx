import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { ChipRow } from './ChipRow'
import { FixNotice } from './FixNotice'
import { useProjectAction, useProjectQuery } from '../lib/projectRpc'
import { useDeveloperDetails } from '../lib/developer-details'

type Held = { roles: string[]; scopes: string[]; directScopes: string[] }
type Role = { name: string; description?: string }

const HELD = 'admin:scopeListUserRoles'

export function AccountAccess({ projectKey, userId, name }: { projectKey: string; userId: string; name: string }) {
  const [technical] = useDeveloperDetails()
  const [role, setRole] = useState('')
  const [scope, setScope] = useState('')
  const held = useProjectQuery<Held>(projectKey, HELD, { userId })
  const roles = useProjectQuery<{ roles: Role[] }>(projectKey, 'admin:scopeListRoles')
  const declared = useProjectQuery<{ scopes: { id: string; declared: boolean }[] }>(projectKey, 'admin:scopeListDeclared', undefined, { enabled: technical })
  const addRole = useProjectAction<{ userId: string; role: string }>(projectKey, 'admin:scopeAddUserToRole', [HELD])
  const dropRole = useProjectAction<{ userId: string; role: string }>(projectKey, 'admin:scopeRemoveUserFromRole', [HELD])
  const addScope = useProjectAction<{ userId: string; scope: string }>(projectKey, 'admin:scopeAddScopeToUser', [HELD])
  const dropScope = useProjectAction<{ userId: string; scope: string }>(projectKey, 'admin:scopeRemoveScopeFromUser', [HELD])
  const busy = addRole.isPending || dropRole.isPending || addScope.isPending || dropScope.isPending
  const failed = addRole.error ?? dropRole.error ?? addScope.error ?? dropScope.error
  const clear = () => [addRole, dropRole, addScope, dropScope].forEach((a) => a.reset())

  if (held.isError || roles.isError) return <p className="text-px15 text-ink-2">{m.accounts_access__unavailable()}</p>
  if (!held.data || !roles.data) return <div className="h-16 animate-pulse rounded-card bg-secondary" />

  const mine = held.data.roles
  const describe = (r: string) => roles.data.roles.find((x) => x.name === r)?.description
  const open = roles.data.roles.filter((r) => !mine.includes(r.name))
  const direct = held.data.directScopes
  const grantable = (declared.data?.scopes ?? []).filter((s) => s.declared && !direct.includes(s.id))

  return (
    <section className="flex flex-col gap-3" aria-label={m.accounts_access__title()}>
      <h3 className="font-heading text-[18px] font-bold">{m.accounts_access__title()}</h3>
      {roles.data.roles.length === 0 ? (
        <p className="text-px15 text-ink-2">{m.accounts_access__no_roles_in_app()}</p>
      ) : mine.length === 0 ? (
        <p className="text-px15 text-ink-2">{m.accounts_access__no_role({ name: asI18n(name) })}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {mine.map((r) => (
            <li key={r} className="flex items-center gap-3">
              <span className="min-w-0 flex-1">
                <b className="block text-px16">{asI18n(r)}</b>
                {describe(r) ? <small className="block text-px14 text-ink-2">{asI18n(describe(r)!)}</small> : null}
              </span>
              <Button type="button" variant="ghost" size="compactTight" disabled={busy} onClick={() => { clear(); dropRole.mutate({ userId, role: r }) }}>
                {m.accounts_access__take_away()}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {open.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger shape="pill" aria-label={m.accounts_access__pick_role()}>
              <SelectValue placeholder={m.accounts_access__pick_role()} />
            </SelectTrigger>
            <SelectContent>
              {open.map((r) => (
                <SelectItem key={r.name} value={r.name}>
                  {asI18n(r.name)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="bordered" size="compact" disabled={!role || busy} aria-busy={addRole.isPending} onClick={() => { clear(); addRole.mutate({ userId, role }, { onSuccess: () => setRole('') }) }}>
            {m.accounts_access__give_role()}
          </Button>
        </div>
      ) : null}
      {failed ? (
        <FixNotice
          title={m.accounts_panel__failed_title()}
          body={m.accounts_panel__failed_body()}
          ask={m.accounts_panel__failed_ask({ name: asI18n(name), details: asI18n(failed instanceof Error ? failed.message : '') })}
          onRetry={clear}
        />
      ) : null}
      {technical ? (
        <div className="flex flex-col gap-3 rounded-xl bg-secondary p-4">
          <p className="text-px14 text-ink-2">{m.accounts_access__id()}</p>
          <code dir="ltr" className="block font-mono text-px13 break-words">{asI18n(userId)}</code>
          <p className="text-px14 text-ink-2">{m.accounts_access__direct()}</p>
          {direct.length ? (
            <ChipRow>
              {direct.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-input bg-field ps-3 text-px13">
                  <code dir="ltr" className="font-mono">{asI18n(s)}</code>
                  <button type="button" aria-label={m.accounts_access__remove_scope({ scope: asI18n(s) })} disabled={busy} onClick={() => { clear(); dropScope.mutate({ userId, scope: s }) }} className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-secondary hover:text-foreground">
                    <X className="size-4" />
                  </button>
                </span>
              ))}
            </ChipRow>
          ) : (
            <p className="text-px14 text-ink-2">{m.accounts_access__no_direct()}</p>
          )}
          {grantable.length ? (
            <div className="flex flex-wrap items-center gap-2">
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger shape="pill" aria-label={m.accounts_access__pick_scope()}>
                  <SelectValue placeholder={m.accounts_access__pick_scope()} />
                </SelectTrigger>
                <SelectContent>
                  {grantable.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {asI18n(s.id)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" variant="bordered" size="compact" disabled={!scope || busy} aria-busy={addScope.isPending} onClick={() => { clear(); addScope.mutate({ userId, scope }, { onSuccess: () => setScope('') }) }}>
                {m.accounts_access__grant_scope()}
              </Button>
            </div>
          ) : null}
          <p className="text-px14 text-ink-2">{m.accounts_access__all()}</p>
          {held.data.scopes.length ? (
            <code dir="ltr" className="block font-mono text-px13 break-words">{asI18n(held.data.scopes.join(', '))}</code>
          ) : (
            <p className="text-px14 text-ink-2">{m.accounts_access__none_at_all()}</p>
          )}
        </div>
      ) : null}
    </section>
  )
}
